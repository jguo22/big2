import { randomUUID } from 'node:crypto';
import { botMove, MAX_PLAYERS, MIN_PLAYERS, pass, playCards, redactMatch, RoomView } from '@bigtwo/rules';
import { ActionError } from '../errors.js';
import { applyPass, applyPlay, startMatch } from '../matches/match-service.js';
import { SnapshotStore } from '../persistence/store.js';
import { Room, ServerPlayer, Session } from './types.js';

/** Characters used in room codes. Ambiguous glyphs (I, O, 0, 1) are excluded. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;

/** A room with no connected player for this long is swept away. */
const ABANDONED_ROOM_MS = 30 * 60 * 1000;

/**
 * Owns every room and session. All mutations happen here so that exactly one
 * component decides what is legal, and every mutation persists a snapshot.
 *
 * Methods that refuse an action raise `ActionError`; callers translate that
 * into a protocol error message.
 */
export class RoomService {
  private readonly rooms = new Map<string, Room>();
  private readonly sessions = new Map<string, Session>();

  constructor(private readonly store: SnapshotStore) {}

  /** Restores rooms and sessions from the last snapshot, if there is one. */
  async restore(): Promise<void> {
    const snapshot = await this.store.load();
    if (!snapshot) return;
    for (const room of snapshot.rooms) {
      for (const player of room.players) player.connected = false;
      this.rooms.set(room.code, room);
    }
    for (const session of snapshot.sessions) this.sessions.set(session.id, session);
  }

  /**
   * Looks up an existing session or creates one.
   *
   * Params:
   *   sessionId: the id the client remembered, or `null` for a first visit.
   *   name: display name to use; ignored when it is blank.
   * Returns: the session, which may be brand new.
   */
  resolveSession(sessionId: string | null, name: string): Session {
    const existing = sessionId ? this.sessions.get(sessionId) : undefined;
    if (existing) {
      if (name.trim()) existing.name = sanitizeName(name);
      existing.lastSeenAt = Date.now();
      this.renamePlayer(existing);
      this.persist();
      return existing;
    }
    const session: Session = {
      id: randomUUID(),
      playerId: randomUUID(),
      name: sanitizeName(name),
      roomCode: null,
      lastSeenAt: Date.now(),
    };
    this.sessions.set(session.id, session);
    this.persist();
    return session;
  }

  /** The room the session currently sits in, or `null`. */
  roomOf(session: Session): Room | null {
    if (!session.roomCode) return null;
    return this.rooms.get(session.roomCode) ?? null;
  }

  /** Every session id currently seated in `room`, for broadcasting. */
  sessionsInRoom(room: Room): Session[] {
    return [...this.sessions.values()].filter((session) => session.roomCode === room.code);
  }

  /**
   * Creates a room with `session` as host and first seat.
   *
   * Returns: the new room.
   */
  createRoom(session: Session): Room {
    this.leaveRoom(session);
    const room: Room = {
      code: this.freshCode(),
      hostId: session.playerId,
      phase: 'lobby',
      players: [],
      match: null,
      updatedAt: Date.now(),
    };
    this.rooms.set(room.code, room);
    this.seat(room, session);
    this.persist();
    return room;
  }

  /**
   * Seats `session` in an existing room, or reclaims its seat if it is already
   * a member (the reconnect path).
   *
   * Params:
   *   session: the joining session.
   *   code: room code, case-insensitive.
   * Returns: the room.
   * Raises: `ActionError` with `room_not_found`, `room_full`, or
   *   `match_in_progress` when a stranger tries to join a running match.
   */
  joinRoom(session: Session, code: string): Room {
    const room = this.rooms.get(code.trim().toUpperCase());
    if (!room) throw new ActionError('room_not_found', 'No room with that code.');

    const seated = room.players.find((player) => player.id === session.playerId);
    if (seated) {
      seated.connected = true;
      seated.lastSeenAt = Date.now();
      session.roomCode = room.code;
      this.persist();
      return room;
    }
    if (room.phase !== 'lobby') {
      throw new ActionError('match_in_progress', 'That room is already playing a match.');
    }
    if (room.players.length >= MAX_PLAYERS) {
      throw new ActionError('room_full', 'That room is full.');
    }
    this.leaveRoom(session);
    this.seat(room, session);
    this.persist();
    return room;
  }

  /**
   * Removes `session` from whatever room it is in. Leaving during a match ends
   * that match and returns the remaining players to the lobby, because the
   * rules engine cannot continue with an empty seat. Does nothing if the
   * session is not in a room.
   */
  leaveRoom(session: Session): void {
    const room = this.roomOf(session);
    session.roomCode = null;
    if (!room) return;

    const wasSeated = room.players.some((player) => player.id === session.playerId);
    room.players = room.players.filter((player) => player.id !== session.playerId);

    // A room of nothing but bots has nobody to play against and nobody to
    // broadcast to, so it goes away with the last person.
    if (!room.players.some((player) => !player.isBot)) {
      this.rooms.delete(room.code);
      this.persist();
      return;
    }
    if (wasSeated && room.phase === 'playing') {
      room.match = null;
      room.phase = 'lobby';
      for (const player of room.players) player.ready = player.isBot;
    }
    if (!room.players.some((player) => player.id === room.hostId)) {
      room.hostId = room.players.find((player) => !player.isBot)!.id;
    }
    this.reseat(room);
    this.touch(room);
  }

  /**
   * Seats a bot. Only the host may add one, and only before a match starts.
   *
   * Bots are always ready, hold no session, and never receive broadcasts.
   *
   * Returns: the room, with the new bot seated last.
   * Raises: `ActionError` with `not_host`, `room_full`, or `match_in_progress`.
   */
  addBot(session: Session): Room {
    const { room, player } = this.requireSeat(session);
    if (player.id !== room.hostId) throw new ActionError('not_host', 'Only the host can add a bot.');
    if (room.phase === 'playing') throw new ActionError('match_in_progress', 'The match has already started.');
    if (room.players.length >= MAX_PLAYERS) throw new ActionError('room_full', 'The room is full.');

    room.players.push({
      id: `bot-${randomUUID()}`,
      name: this.freshBotName(room),
      seat: room.players.length,
      ready: true,
      connected: true,
      isBot: true,
      lastSeenAt: Date.now(),
    });
    this.touch(room);
    return room;
  }

  /**
   * Removes a bot the host previously added.
   *
   * Params:
   *   playerId: the bot's player id.
   * Raises: `ActionError` with `not_host`, `match_in_progress`, or `not_a_bot`
   *   when the id is not a bot seated in this room.
   */
  removeBot(session: Session, playerId: string): Room {
    const { room, player } = this.requireSeat(session);
    if (player.id !== room.hostId) throw new ActionError('not_host', 'Only the host can remove a bot.');
    if (room.phase === 'playing') throw new ActionError('match_in_progress', 'The match has already started.');

    const bot = room.players.find((seated) => seated.id === playerId && seated.isBot);
    if (!bot) throw new ActionError('not_a_bot', 'That seat is not a bot.');

    room.players = room.players.filter((seated) => seated.id !== playerId);
    this.reseat(room);
    this.touch(room);
    return room;
  }

  /** Sets the ready flag used to gate match start. */
  setReady(session: Session, ready: boolean): Room {
    const { room, player } = this.requireSeat(session);
    player.ready = ready;
    this.touch(room);
    return room;
  }

  /**
   * Deals a match. Only the host may start one, every seated player must be
   * ready, and the room must hold at least `MIN_PLAYERS`.
   *
   * Raises: `ActionError` with `not_host`, `not_enough_players`,
   *   `players_not_ready`, or `match_in_progress`.
   */
  startMatch(session: Session): Room {
    const { room, player } = this.requireSeat(session);
    if (player.id !== room.hostId) throw new ActionError('not_host', 'Only the host can start the match.');
    if (room.phase === 'playing') throw new ActionError('match_in_progress', 'The match has already started.');
    if (room.players.length < MIN_PLAYERS) {
      throw new ActionError('not_enough_players', `A match needs at least ${MIN_PLAYERS} players.`);
    }
    if (!room.players.every((seated) => seated.ready || seated.id === room.hostId)) {
      throw new ActionError('players_not_ready', 'Every player must be ready.');
    }
    this.reseat(room);
    room.match = startMatch(room.players.map((seated) => seated.id));
    room.phase = 'playing';
    this.runBots(room);
    this.touch(room);
    return room;
  }

  /**
   * Submits a play on behalf of `session`.
   *
   * Params:
   *   cardIds: ids of the cards to play.
   * Returns: the room, with the match advanced and the phase set to
   *   `finished` if the play emptied the player's hand.
   * Raises: `ActionError`, including `rule:*` codes from the rules engine.
   */
  play(session: Session, cardIds: readonly string[]): Room {
    const { room, player } = this.requireActiveMatch(session);
    room.match = applyPlay(room.match!, player.id, cardIds);
    if (room.match.winnerId) room.phase = 'finished';
    this.runBots(room);
    this.touch(room);
    return room;
  }

  /**
   * Submits a pass on behalf of `session`.
   *
   * Raises: `ActionError`, including `rule:*` codes from the rules engine.
   */
  pass(session: Session): Room {
    const { room, player } = this.requireActiveMatch(session);
    room.match = applyPass(room.match!, player.id);
    this.runBots(room);
    this.touch(room);
    return room;
  }

  /** Returns a finished room to the lobby so the players can deal again. */
  newMatch(session: Session): Room {
    const { room } = this.requireSeat(session);
    if (room.phase === 'playing') {
      throw new ActionError('match_in_progress', 'Finish the current match first.');
    }
    room.match = null;
    room.phase = 'lobby';
    for (const player of room.players) player.ready = player.isBot || player.id === room.hostId;
    this.touch(room);
    return room;
  }

  /** Flags a player as connected or not without disturbing their seat. */
  setConnected(session: Session, connected: boolean): Room | null {
    const room = this.roomOf(session);
    const player = room?.players.find((seated) => seated.id === session.playerId);
    if (!room || !player) return null;
    player.connected = connected;
    player.lastSeenAt = Date.now();
    this.touch(room);
    return room;
  }

  /**
   * Projects a room for one viewer, hiding every other player's cards.
   *
   * Params:
   *   room: the room to project.
   *   viewerId: the public player id the view is for.
   * Returns: a RoomView safe to send to that player.
   */
  viewFor(room: Room, viewerId: string): RoomView {
    const match = room.match ? redactMatch(room.match, viewerId) : null;
    return {
      code: room.code,
      hostId: room.hostId,
      phase: room.phase,
      players: room.players.map((player) => ({
        id: player.id,
        name: player.name,
        seat: player.seat,
        connected: player.connected,
        ready: player.ready,
        isBot: player.isBot,
        handCount: match?.handCounts[player.id] ?? 0,
      })),
      match,
    };
  }

  /** Drops rooms whose players have all been gone longer than the abandon window. */
  sweep(now = Date.now()): void {
    let changed = false;
    for (const room of [...this.rooms.values()]) {
      // Bots are always "connected", so only people keep a room alive.
      const active = room.players.some(
        (player) =>
          !player.isBot && (player.connected || now - player.lastSeenAt < ABANDONED_ROOM_MS),
      );
      if (active) continue;
      this.rooms.delete(room.code);
      for (const session of this.sessionsInRoom(room)) session.roomCode = null;
      changed = true;
    }
    if (changed) this.persist();
  }

  /**
   * Plays out every consecutive bot turn, so that by the time the room is
   * broadcast the turn has come back round to a person (or the match is over).
   * Runs synchronously: one state change, one broadcast.
   */
  private runBots(room: Room): void {
    // One guard iteration per possible turn; a bot either plays a card or
    // passes, so this cannot spin.
    for (let guard = 0; guard < 500; guard++) {
      const match = room.match;
      if (room.phase !== 'playing' || !match || match.winnerId) return;

      const onTurn = room.players.find((player) => player.seat === match.turnSeat);
      if (!onTurn?.isBot) return;

      const move = botMove(match, onTurn.id);
      const result = move ? playCards(match, onTurn.id, move) : pass(match, onTurn.id);
      if (!result.ok) {
        // A bot should never produce an illegal move. Stop rather than spin,
        // and leave the turn where it is so the room is not wedged silently.
        console.error(`[bots] ${onTurn.name} produced an illegal move: ${result.rejection.code}`);
        return;
      }
      room.match = result.state;
      if (result.state.winnerId) room.phase = 'finished';
    }
  }

  /** Lowest unused "Bot N" name in the room, so removing and re-adding reuses names. */
  private freshBotName(room: Room): string {
    const taken = new Set(room.players.map((player) => player.name));
    for (let index = 1; ; index++) {
      const name = `Bot ${index}`;
      if (!taken.has(name)) return name;
    }
  }

  private requireSeat(session: Session): { room: Room; player: ServerPlayer } {
    const room = this.roomOf(session);
    const player = room?.players.find((seated) => seated.id === session.playerId);
    if (!room || !player) throw new ActionError('not_in_room', 'You are not in a room.');
    return { room, player };
  }

  private requireActiveMatch(session: Session): { room: Room; player: ServerPlayer } {
    const seat = this.requireSeat(session);
    if (seat.room.phase !== 'playing' || !seat.room.match) {
      throw new ActionError('bad_request', 'No match is running in this room.');
    }
    return seat;
  }

  private seat(room: Room, session: Session): void {
    room.players.push({
      id: session.playerId,
      name: session.name,
      seat: room.players.length,
      ready: session.playerId === room.hostId,
      connected: true,
      isBot: false,
      lastSeenAt: Date.now(),
    });
    session.roomCode = room.code;
    this.touch(room);
  }

  /** Renumbers seats to stay contiguous from 0, which the rules engine requires. */
  private reseat(room: Room): void {
    room.players.forEach((player, index) => {
      player.seat = index;
    });
  }

  private renamePlayer(session: Session): void {
    const room = this.roomOf(session);
    const player = room?.players.find((seated) => seated.id === session.playerId);
    if (player) player.name = session.name;
  }

  private freshCode(): string {
    for (let attempt = 0; attempt < 1000; attempt++) {
      let code = '';
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    throw new ActionError('internal_error', 'Could not allocate a room code.');
  }

  private touch(room: Room): void {
    room.updatedAt = Date.now();
    this.persist();
  }

  private persist(): void {
    this.store.save({
      version: 1,
      rooms: [...this.rooms.values()],
      sessions: [...this.sessions.values()],
    });
  }
}

function sanitizeName(name: string): string {
  const trimmed = name.replace(/\s+/g, ' ').trim().slice(0, 20);
  return trimmed || 'Player';
}
