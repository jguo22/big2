import { ActionResult, createMatch, MatchState, pass, playCards } from '@bigtwo/rules';
import { ActionError } from '../errors.js';

/**
 * Deals a match for the given seat order.
 *
 * Params:
 *   playerIds: 2 to 4 player ids in seat order.
 * Returns: the new authoritative match state.
 * Raises: `ActionError('not_enough_players')` if fewer than 2 or more than 4.
 */
export function startMatch(playerIds: readonly string[]): MatchState {
  if (playerIds.length < 2 || playerIds.length > 4) {
    throw new ActionError('not_enough_players', 'A match needs 2 to 4 players.');
  }
  return createMatch(playerIds);
}

/**
 * Applies a play, converting a rules-engine rejection into an `ActionError`
 * whose code is the rejection code prefixed with `rule:`.
 *
 * Params:
 *   state: authoritative match state; not mutated.
 *   playerId: the acting player.
 *   cardIds: cards the player wants to play.
 * Returns: the next match state.
 * Raises: `ActionError` when the rules engine rejects the play.
 */
export function applyPlay(state: MatchState, playerId: string, cardIds: readonly string[]): MatchState {
  return unwrap(playCards(state, playerId, cardIds));
}

/**
 * Applies a pass.
 *
 * Params:
 *   state: authoritative match state; not mutated.
 *   playerId: the acting player.
 * Returns: the next match state.
 * Raises: `ActionError` when the rules engine rejects the pass.
 */
export function applyPass(state: MatchState, playerId: string): MatchState {
  return unwrap(pass(state, playerId));
}

function unwrap(result: ActionResult): MatchState {
  if (result.ok) return result.state;
  throw new ActionError(`rule:${result.rejection.code}`, result.rejection.message);
}
