import { randomUUID } from 'node:crypto';
import {
  botMove,
  DEFAULT_BOT_SPEED_MS,
  MAX_BOT_SPEED_MS,
  MAX_PLAYERS,
  MIN_BOT_SPEED_MS,
  MIN_PLAYERS,
  pass,
  playCards,
  redactMatch,
  RoomSettings,
  RoomView,
} from '@bigtwo/rules';
import { RoomSummary } from '@bigtwo/rules';
import { ActionError } from '../errors.js';
import { applyPass, applyPlay, startMatch } from '../matches/match-service.js';
import { SnapshotStore } from '../persistence/store.js';
import { hashPassword, verifyPassword } from './password.js';
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
  /** Pending bot turns, keyed by room code; at most one per room. */
  private readonly botTimers = new Map<string, NodeJS.Timeout>();
  private roomChanged: ((room: Room) => void) | null = null;

  constructor(private readonly store: SnapshotStore) {}

  /** Restores rooms and sessions from the last snapshot, if there is one. */
  async restore(): Promise<void> {
    const snapshot = await this.store.load();
    if (!snapshot) return;
    for (const room of snapshot.rooms) {
      for (const player of room.players) player.connected = false;
      room.settings = sanitizeSettings(room.settings);
      // Older snapshots predate the separate table display state.
      if (room.match) {
        const match = room.match;
        room.match = {
          ...match,
          visiblePlays: (match.visiblePlays ?? (match.currentPlay ? [match.currentPlay] : []))
            .filter((play) => match.winnerId !== null || play.seat !== match.turnSeat),
          visiblePassedSeats: (match.visiblePassedSeats ?? match.passedSeats)
            .filter((seat) => match.winnerId !== null || seat !== match.turnSeat),
        };
      }
      this.rooms.set(room.code, room);
      // A snapshot may have been taken while a bot was on turn; without this
      // the restored match would sit wedged on that seat forever.
      this.scheduleBots(room);
    }
    for (const session of snapshot.sessions) this.sessions.set(session.id, session);
  }

  /**
   * Registers the callback invoked after a bot move changes a room, so the
   * transport can broadcast state that no client action produced. Only one
   * listener is kept; a later call replaces an earlier one.
   *
   * Params:
   *   listener: receives the changed room, already mutated and persisted.
   */
  observeRooms(listener: (room: Room) => void): void {
    this.roomChanged = listener;
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
   * Params:
   *   name: host-chosen room name. Blank falls back to "<host>'s table".
   *   password: blank or omitted leaves the room public; otherwise joining
   *     requires this password, which is stored only as a salted hash.
   *   settings: advanced settings; each omitted or unusable field falls back to
   *     its default, and values out of range are clamped rather than refused.
   * Returns: the new room.
   */
  createRoom(session: Session, name = '', password = '', settings: Partial<RoomSettings> = {}): Room {
    this.leaveRoom(session);
    const room: Room = {
      code: this.freshCode(),
      name: sanitizeRoomName(name) || `${session.name}'s table`,
      hostId: session.playerId,
      password: password.trim() ? hashPassword(password.trim()) : null,
      settings: sanitizeSettings(settings),
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
   *   password: required when the room is private. Ignored for a player
   *     already seated, so a reconnect never has to re-enter it.
   * Returns: the room.
   * Raises: `ActionError` with `room_not_found`, `wrong_password`, `room_full`,
   *   or `match_in_progress` when a stranger tries to join a running match.
   */
  joinRoom(session: Session, code: string, password = ''): Room {
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
    if (room.password && !verifyPassword(password, room.password)) {
      throw new ActionError('wrong_password', 'That password is not right.');
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
      this.cancelBots(room);
      this.rooms.delete(room.code);
      this.persist();
      return;
    }
    if (wasSeated && room.phase === 'playing') {
      this.cancelBots(room);
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
    this.touch(room);
    this.scheduleBots(room);
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
    this.touch(room);
    this.scheduleBots(room);
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
    this.touch(room);
    this.scheduleBots(room);
    return room;
  }

  /** Returns a finished room to the lobby so the players can deal again. */
  newMatch(session: Session): Room {
    const { room } = this.requireSeat(session);
    if (room.phase === 'playing') {
      throw new ActionError('match_in_progress', 'Finish the current match first.');
    }
    this.cancelBots(room);
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
      name: room.name,
      hostId: room.hostId,
      phase: room.phase,
      isPrivate: room.password !== null,
      settings: room.settings,
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

  /**
   * Lists every room for the lobby browser, newest activity first.
   *
   * Private rooms are included so players can see the game exists; only the
   * password itself is withheld, and joining still requires it.
   *
   * Returns: one summary per room. Never includes hands or password material.
   */
  listRooms(): RoomSummary[] {
    return [...this.rooms.values()]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((room) => ({
        code: room.code,
        name: room.name,
        hostName: room.players.find((player) => player.id === room.hostId)?.name ?? 'Unknown',
        playerCount: room.players.length,
        maxPlayers: MAX_PLAYERS,
        isPrivate: room.password !== null,
        phase: room.phase,
      }));
  }

  /** Every session that is not currently seated, for room-list broadcasts. */
  lobbySessions(): Session[] {
    return [...this.sessions.values()].filter((session) => session.roomCode === null);
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
      this.cancelBots(room);
      this.rooms.delete(room.code);
      for (const session of this.sessionsInRoom(room)) session.roomCode = null;
      changed = true;
    }
    if (changed) this.persist();
  }

  /**
   * Queues the bot on turn, if any, to move after the room's bot speed. Each
   * move broadcasts on its own and queues the next, so players watch bots play
   * one seat at a time. Replaces any move already queued for this room.
   */
  private scheduleBots(room: Room): void {
    this.cancelBots(room);
    if (!this.botOnTurn(room)) return;
    const timer = setTimeout(() => {
      this.botTimers.delete(room.code);
      this.playBotTurn(room);
    }, room.settings.botSpeedMs);
    // A queued bot turn must not keep the process alive on shutdown.
    timer.unref();
    this.botTimers.set(room.code, timer);
  }

  /** Drops the move queued for `room`, if any. */
  private cancelBots(room: Room): void {
    const timer = this.botTimers.get(room.code);
    if (!timer) return;
    clearTimeout(timer);
    this.botTimers.delete(room.code);
  }

  /** Plays the queued bot's move, announces it, and queues whoever is next. */
  private playBotTurn(room: Room): void {
    // The room may have been abandoned or restarted while the move was queued.
    if (this.rooms.get(room.code) !== room) return;
    const bot = this.botOnTurn(room);
    if (!bot) return;

    const match = room.match!;
    const move = botMove(match, bot.id);
    const result = move ? playCards(match, bot.id, move) : pass(match, bot.id);
    if (!result.ok) {
      // A bot should never produce an illegal move. Stop rather than retry, and
      // leave the turn where it is so the room is not wedged silently.
      console.error(`[bots] ${bot.name} produced an illegal move: ${result.rejection.code}`);
      return;
    }
    room.match = result.state;
    if (result.state.winnerId) room.phase = 'finished';
    this.touch(room);
    this.roomChanged?.(room);
    this.scheduleBots(room);
  }

  /** The bot whose turn it is in a running match, or `null`. */
  private botOnTurn(room: Room): ServerPlayer | null {
    const match = room.match;
    if (room.phase !== 'playing' || !match || match.winnerId) return null;
    const onTurn = room.players.find((player) => player.seat === match.turnSeat);
    return onTurn?.isBot ? onTurn : null;
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

function sanitizeRoomName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, 30);
}

/** Fills in defaults and clamps each setting, so no client value can be trusted in. */
function sanitizeSettings(settings: Partial<RoomSettings> | undefined): RoomSettings {
  const requested = Number(settings?.botSpeedMs);
  const botSpeedMs = Number.isFinite(requested)
    ? Math.min(MAX_BOT_SPEED_MS, Math.max(MIN_BOT_SPEED_MS, Math.round(requested)))
    : DEFAULT_BOT_SPEED_MS;
  return { botSpeedMs };
}
