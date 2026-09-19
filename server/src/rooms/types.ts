import { MatchState, RoomPhase } from '@bigtwo/rules';
import { PasswordHash } from './password.js';

/** A seated player as the server tracks them, including presence. */
export interface ServerPlayer {
  id: string;
  name: string;
  seat: number;
  ready: boolean;
  connected: boolean;
  /** True for a seat the host filled with a bot. Bots have no session. */
  isBot: boolean;
  /** Epoch milliseconds of the last message or disconnect. */
  lastSeenAt: number;
}

/** A room and, while a match runs, its authoritative state. */
export interface Room {
  code: string;
  /** Host-chosen display name, shown in the room list. */
  name: string;
  hostId: string;
  /** Set when the host protected the room; `null` means the room is public. */
  password: PasswordHash | null;
  phase: RoomPhase;
  players: ServerPlayer[];
  match: MatchState | null;
  updatedAt: number;
}

/**
 * A browser's persistent identity. The `id` is a secret held in the client's
 * local storage and is what lets a refreshed or reconnected browser reclaim
 * its seat; `playerId` is the public id shown to everyone in the room.
 */
export interface Session {
  id: string;
  playerId: string;
  name: string;
  roomCode: string | null;
  lastSeenAt: number;
}
