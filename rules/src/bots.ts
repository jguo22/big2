import { compareCombinations } from './combinations.js';
import { legalPlays, MatchState } from './match-rules.js';

/**
 * Chooses a bot's move: the lowest combination it can legally play, or a pass
 * when it holds nothing that beats the current play.
 *
 * "Lowest" orders plays by card count first and then by comparison key, so a
 * bot spends its weakest cards first and keeps its high ones back.
 *
 * A leading bot always plays, because the rules forbid passing on a lead and
 * nobody could ever play if they did not.
 *
 * Params:
 *   state: the authoritative match state.
 *   playerId: the bot, which must be the player on turn.
 * Returns: card ids for the bot to play, or `null` for a pass.
 */
export function botMove(state: MatchState, playerId: string): string[] | null {
  const hand = state.hands[playerId] ?? [];
  if (hand.length === 0) return null;

  if (!state.currentPlay) {
    // Leading, so every combination in hand is legal. Under the ordering above
    // the lowest of them is always the weakest single, which the sorted hand
    // puts first — no need to enumerate every subset to find it.
    const required = state.history.length === 0 ? state.startingCardId : null;
    const opening = required ? hand.find((card) => card.id === required) : undefined;
    return [(opening ?? hand[0]).id];
  }

  const options = legalPlays(hand, state.currentPlay);
  if (options.length === 0) return null;

  options.sort((a, b) => a.size - b.size || compareCombinations(a, b));
  return options[0].cards.map((card) => card.id);
}
