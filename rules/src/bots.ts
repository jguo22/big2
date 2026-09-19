import { MatchState } from './match-rules.js';

/**
 * Chooses a bot's move.
 *
 * The current policy is to pass whenever there is a play to beat. A bot that
 * is leading cannot pass — the rules forbid it, and nobody could ever play if
 * they could — so a leading bot plays its weakest single instead, which is
 * always a legal lead. On the opening play of a match that single is the
 * required starting card.
 *
 * Params:
 *   state: the authoritative match state.
 *   playerId: the bot, which must be the player on turn.
 * Returns: card ids for the bot to play, or `null` for a pass.
 */
export function botMove(state: MatchState, playerId: string): string[] | null {
  if (state.currentPlay) return null;

  const hand = state.hands[playerId] ?? [];
  if (hand.length === 0) return null;

  const isOpeningPlay = state.history.length === 0 && state.startingCardId !== null;
  const opening = isOpeningPlay ? hand.find((card) => card.id === state.startingCardId) : undefined;

  // Hands are kept sorted ascending, so the first card is the weakest single.
  return [(opening ?? hand[0]).id];
}
