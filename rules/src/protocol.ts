/**
 * Wire contract shared by the server and the client.
 *
 * Type declarations only: this module is erased at build time and pulls in no
 * network or UI dependency, so the rules package stays transport-agnostic.
 */
import { PublicMatchState } from './match-rules.js';

/** A seat in a room, as everyone in the room may see it. */
export interface PublicPlayer {
  readonly id: string;
  readonly name: string;
  readonly seat: number;
  readonly connected: boolean;
  readonly ready: boolean;
  readonly handCount: number;
  /** True for a seat filled by a bot rather than a person. */
  readonly isBot: boolean;
}

export type RoomPhase = 'lobby' | 'playing' | 'finished';

/** The whole room as one player may see it. */
export interface RoomView {
  readonly code: string;
  readonly hostId: string;
  readonly phase: RoomPhase;
  readonly players: readonly PublicPlayer[];
  readonly match: PublicMatchState | null;
}

/** Maximum players a room will seat. */
export const MAX_PLAYERS = 4;

/** Minimum players required to start a match. */
export const MIN_PLAYERS = 2;

/**
 * Messages a client may send. Every message carries a `requestId`; resending a
 * message with the same `requestId` returns the original reply instead of
 * applying the action twice.
 */
export type ClientMessage =
  | { type: 'hello'; requestId: string; sessionId: string | null; name: string }
  | { type: 'create_room'; requestId: string }
  | { type: 'join_room'; requestId: string; code: string }
  | { type: 'leave_room'; requestId: string }
  | { type: 'set_name'; requestId: string; name: string }
  | { type: 'set_ready'; requestId: string; ready: boolean }
  | { type: 'add_bot'; requestId: string }
  | { type: 'remove_bot'; requestId: string; playerId: string }
  | { type: 'start_match'; requestId: string }
  | { type: 'play'; requestId: string; cardIds: string[] }
  | { type: 'pass'; requestId: string }
  | { type: 'new_match'; requestId: string }
  | { type: 'ping'; requestId: string };

/** Machine-readable error codes the server may return. */
export type ErrorCode =
  | 'bad_request'
  | 'not_in_room'
  | 'room_not_found'
  | 'room_full'
  | 'match_in_progress'
  | 'not_host'
  | 'not_a_bot'
  | 'not_enough_players'
  | 'players_not_ready'
  | 'rate_limited'
  | 'internal_error'
  | `rule:${string}`;

/** Messages the server may send. */
export type ServerMessage =
  | { type: 'welcome'; requestId?: string; sessionId: string; playerId: string; name: string }
  | { type: 'room'; requestId?: string; room: RoomView; youId: string }
  | { type: 'lobby'; requestId?: string }
  | { type: 'error'; requestId?: string; code: ErrorCode; message: string }
  | { type: 'pong'; requestId?: string };
