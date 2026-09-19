import { IncomingMessage, Server as HttpServer } from 'node:http';
import { ClientMessage, ServerMessage } from '@bigtwo/rules';
import { WebSocket, WebSocketServer } from 'ws';
import { ActionError } from '../errors.js';
import { RoomService } from '../rooms/room-service.js';
import { Room, Session } from '../rooms/types.js';

/** How often the server pings each socket. */
const HEARTBEAT_MS = 15_000;

/** A socket that misses this many consecutive heartbeats is closed. */
const MISSED_HEARTBEATS = 2;

/** Messages a single connection may send per second before being throttled. */
const MESSAGE_BUDGET_PER_SECOND = 40;

/** Replies retained per session so that retried requests stay idempotent. */
const REQUEST_CACHE_SIZE = 64;

interface Connection {
  socket: WebSocket;
  session: Session | null;
  missedHeartbeats: number;
  budget: number;
  budgetResetAt: number;
}

/**
 * Attaches the game's WebSocket endpoint to an HTTP server.
 *
 * Every client message is validated here and applied through `rooms`, which is
 * the only component that may change room state. After any successful mutation
 * the affected room is re-broadcast to each of its players, redacted per player.
 *
 * Params:
 *   httpServer: server to attach to; upgrades on any path.
 *   rooms: the room service holding authoritative state.
 * Returns: a `close` function that stops the heartbeat and shuts the socket
 *   server down.
 */
export function attachGameSocket(httpServer: HttpServer, rooms: RoomService): () => Promise<void> {
  const wss = new WebSocketServer({ server: httpServer });
  const connections = new Map<WebSocket, Connection>();
  const socketsBySession = new Map<string, Set<WebSocket>>();
  const requestCache = new Map<string, Map<string, ServerMessage>>();

  // Bots move on their own timer, so their state changes have no request to
  // reply to and must be pushed out here.
  rooms.observeRooms((room) => {
    broadcastRoom(room);
    broadcastRoomList();
  });

  wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    const connection: Connection = {
      socket,
      session: null,
      missedHeartbeats: 0,
      budget: MESSAGE_BUDGET_PER_SECOND,
      budgetResetAt: Date.now() + 1000,
    };
    connections.set(socket, connection);
    console.log('[ws] connected', request.socket.remoteAddress);

    socket.on('pong', () => {
      connection.missedHeartbeats = 0;
    });

    socket.on('message', (raw) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        send(socket, { type: 'error', code: 'bad_request', message: 'Malformed message.' });
        return;
      }
      handleMessage(connection, message);
    });

    socket.on('close', () => {
      connections.delete(socket);
      if (!connection.session) return;
      unregisterSocket(connection.session.id, socket);
      const room = rooms.setConnected(connection.session, false);
      if (room) broadcastRoom(room);
    });

    socket.on('error', (error) => console.error('[ws] socket error', error));
  });

  const heartbeat = setInterval(() => {
    for (const connection of connections.values()) {
      if (connection.missedHeartbeats >= MISSED_HEARTBEATS) {
        connection.socket.terminate();
        continue;
      }
      connection.missedHeartbeats += 1;
      connection.socket.ping();
    }
    rooms.sweep();
  }, HEARTBEAT_MS);

  function handleMessage(connection: Connection, message: ClientMessage): void {
    if (typeof message?.type !== 'string' || typeof message?.requestId !== 'string') {
      send(connection.socket, { type: 'error', code: 'bad_request', message: 'Missing type or requestId.' });
      return;
    }
    if (!spendBudget(connection)) {
      send(connection.socket, {
        type: 'error',
        requestId: message.requestId,
        code: 'rate_limited',
        message: 'Slow down.',
      });
      return;
    }

    const cached = connection.session && cacheFor(connection.session.id).get(message.requestId);
    if (cached) {
      send(connection.socket, cached);
      return;
    }

    try {
      const reply = dispatch(connection, message);
      if (!reply) return;
      if (connection.session) remember(connection.session.id, message.requestId, reply);
      send(connection.socket, reply);
    } catch (error) {
      const reply: ServerMessage =
        error instanceof ActionError
          ? { type: 'error', requestId: message.requestId, code: error.code, message: error.message }
          : { type: 'error', requestId: message.requestId, code: 'internal_error', message: 'Something went wrong.' };
      if (!(error instanceof ActionError)) console.error('[ws] unhandled error', error);
      send(connection.socket, reply);
    }
  }

  /**
   * Applies one message and returns the reply to send to the sender, or `null`
   * when the reply is delivered by broadcast instead. Raises `ActionError` for
   * anything the rules or room service refuse.
   */
  function dispatch(connection: Connection, message: ClientMessage): ServerMessage | null {
    if (message.type === 'hello') {
      const session = rooms.resolveSession(message.sessionId, message.name ?? '');
      connection.session = session;
      registerSocket(session.id, connection.socket);
      send(connection.socket, {
        type: 'welcome',
        requestId: message.requestId,
        sessionId: session.id,
        playerId: session.playerId,
        name: session.name,
      });
      const room = rooms.setConnected(session, true) ?? rooms.roomOf(session);
      if (room) {
        broadcastRoom(room);
        return null;
      }
      // Not seated, so this client is browsing: prime it with the room list.
      send(connection.socket, { type: 'rooms', rooms: rooms.listRooms() });
      return { type: 'lobby', requestId: message.requestId };
    }

    const session = connection.session;
    if (!session) throw new ActionError('bad_request', 'Send hello before any other message.');
    session.lastSeenAt = Date.now();

    switch (message.type) {
      case 'ping':
        return { type: 'pong', requestId: message.requestId };

      case 'set_name': {
        rooms.resolveSession(session.id, message.name ?? '');
        const room = rooms.roomOf(session);
        if (room) broadcastRoom(room);
        return { type: 'welcome', requestId: message.requestId, sessionId: session.id, playerId: session.playerId, name: session.name };
      }

      case 'leave_room': {
        const previous = rooms.roomOf(session);
        rooms.leaveRoom(session);
        if (previous) broadcastRoom(previous);
        broadcastRoomList();
        return { type: 'lobby', requestId: message.requestId };
      }

      case 'list_rooms':
        return { type: 'rooms', requestId: message.requestId, rooms: rooms.listRooms() };

      case 'create_room':
        return afterMutation(
          rooms.createRoom(
            session,
            String(message.name ?? ''),
            String(message.password ?? ''),
            message.settings ?? {},
          ),
          session,
          message.requestId,
        );
      case 'join_room':
        return afterMutation(
          rooms.joinRoom(session, String(message.code ?? ''), String(message.password ?? '')),
          session,
          message.requestId,
        );
      case 'set_ready':
        return afterMutation(rooms.setReady(session, message.ready === true), session, message.requestId);
      case 'add_bot':
        return afterMutation(rooms.addBot(session), session, message.requestId);
      case 'remove_bot':
        return afterMutation(
          rooms.removeBot(session, String(message.playerId ?? '')),
          session,
          message.requestId,
        );
      case 'start_match':
        return afterMutation(rooms.startMatch(session), session, message.requestId);
      case 'play':
        return afterMutation(rooms.play(session, toCardIds(message.cardIds)), session, message.requestId);
      case 'pass':
        return afterMutation(rooms.pass(session), session, message.requestId);
      case 'new_match':
        return afterMutation(rooms.newMatch(session), session, message.requestId);
      default:
        throw new ActionError('bad_request', `Unsupported message type.`);
    }
  }

  /** Broadcasts the changed room and returns the sender's own acknowledged view. */
  function afterMutation(room: Room, session: Session, requestId: string): ServerMessage {
    broadcastRoom(room, session.id);
    broadcastRoomList();
    return { type: 'room', requestId, room: rooms.viewFor(room, session.playerId), youId: session.playerId };
  }

  /**
   * Pushes the room list to everyone who is browsing rather than seated, so a
   * room appearing, filling up or starting shows without a refresh.
   */
  function broadcastRoomList(): void {
    const payload: ServerMessage = { type: 'rooms', rooms: rooms.listRooms() };
    for (const session of rooms.lobbySessions()) {
      for (const socket of socketsBySession.get(session.id) ?? []) send(socket, payload);
    }
  }

  /**
   * Sends every player in `room` their own redacted view.
   *
   * Params:
   *   skipSessionId: a session that receives the view as a direct reply
   *     instead, so it is not sent the same state twice.
   */
  function broadcastRoom(room: Room, skipSessionId?: string): void {
    for (const session of rooms.sessionsInRoom(room)) {
      if (session.id === skipSessionId) continue;
      const payload: ServerMessage = {
        type: 'room',
        room: rooms.viewFor(room, session.playerId),
        youId: session.playerId,
      };
      for (const socket of socketsBySession.get(session.id) ?? []) send(socket, payload);
    }
  }

  function registerSocket(sessionId: string, socket: WebSocket): void {
    const sockets = socketsBySession.get(sessionId) ?? new Set<WebSocket>();
    sockets.add(socket);
    socketsBySession.set(sessionId, sockets);
  }

  function unregisterSocket(sessionId: string, socket: WebSocket): void {
    const sockets = socketsBySession.get(sessionId);
    if (!sockets) return;
    sockets.delete(socket);
    if (sockets.size === 0) socketsBySession.delete(sessionId);
  }

  function cacheFor(sessionId: string): Map<string, ServerMessage> {
    const cache = requestCache.get(sessionId) ?? new Map<string, ServerMessage>();
    requestCache.set(sessionId, cache);
    return cache;
  }

  function remember(sessionId: string, requestId: string, reply: ServerMessage): void {
    const cache = cacheFor(sessionId);
    cache.set(requestId, reply);
    while (cache.size > REQUEST_CACHE_SIZE) cache.delete(cache.keys().next().value as string);
  }

  return async () => {
    clearInterval(heartbeat);
    for (const socket of connections.keys()) socket.close();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
  };
}

function spendBudget(connection: Connection): boolean {
  const now = Date.now();
  if (now >= connection.budgetResetAt) {
    connection.budget = MESSAGE_BUDGET_PER_SECOND;
    connection.budgetResetAt = now + 1000;
  }
  if (connection.budget <= 0) return false;
  connection.budget -= 1;
  return true;
}

function toCardIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string')) {
    throw new ActionError('bad_request', 'cardIds must be an array of card ids.');
  }
  return value as string[];
}

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}
