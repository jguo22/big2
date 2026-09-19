import { cardValue, sortCards, suitIndex } from './cards/index.js';
import { Card, Rank } from './types.js';

/** The eight legal combination shapes. */
export type ComboCategory =
  | 'single'
  | 'pair'
  | 'triple'
  | 'straight'
  | 'flush'
  | 'fullHouse'
  | 'fourOfAKind'
  | 'straightFlush';

/**
 * A recognised, normalised play.
 *
 * `key` is the comparison key: a fixed-shape numeric vector compared
 * lexicographically against another combination of the same `size`. Never
 * compare `cards` directly.
 */
export interface Combination {
  readonly category: ComboCategory;
  /** Number of cards, always 1, 2, 3 or 5. */
  readonly size: number;
  /** The played cards, sorted ascending by strength. */
  readonly cards: readonly Card[];
  readonly key: readonly number[];
}

/**
 * Strength tier among five-card combinations, weakest to strongest. The three
 * small shapes share tier 0 because they are only ever compared against their
 * own size.
 */
const CATEGORY_TIER: Record<ComboCategory, number> = {
  single: 0,
  pair: 0,
  triple: 0,
  straight: 1,
  flush: 2,
  fullHouse: 3,
  fourOfAKind: 4,
  straightFlush: 5,
};

/**
 * Recognises a set of cards as a legal combination.
 *
 * Params:
 *   cards: the candidate cards. Order is irrelevant; the array is not mutated.
 *     Repeating the same card id makes the play illegal.
 * Returns: the normalised Combination, or `null` if the cards are not a legal
 *   combination (wrong size, mismatched ranks, four-card play, and so on).
 */
export function detectCombination(cards: readonly Card[]): Combination | null {
  const sorted = sortCards(cards);
  if (new Set(sorted.map((c) => c.id)).size !== sorted.length) return null;

  switch (sorted.length) {
    case 1:
      return make('single', sorted, [cardValue(sorted[0])]);
    case 2:
      return sameRank(sorted) ? make('pair', sorted, [cardValue(sorted[1])]) : null;
    case 3:
      return sameRank(sorted) ? make('triple', sorted, [sorted[0].rank]) : null;
    case 5:
      return detectFiveCard(sorted);
    default:
      return null;
  }
}

/**
 * Orders two combinations of equal size.
 *
 * Params:
 *   a, b: combinations to compare.
 * Returns: a negative number if `a` is weaker than `b`, positive if stronger,
 *   0 if they are equally strong (only possible for identical card sets).
 * Raises: `RangeError` if the two combinations use different card counts,
 *   which the rules never allow to be compared.
 */
export function compareCombinations(a: Combination, b: Combination): number {
  if (a.size !== b.size) {
    throw new RangeError(`cannot compare a ${a.size}-card play with a ${b.size}-card play`);
  }
  const len = Math.max(a.key.length, b.key.length);
  for (let i = 0; i < len; i++) {
    const diff = (a.key[i] ?? 0) - (b.key[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Whether `candidate` may legally be played on top of `current`.
 *
 * Returns: `true` when the two plays use the same number of cards and
 *   `candidate` is strictly stronger. Card-count mismatches return `false`
 *   rather than raising.
 */
export function beats(candidate: Combination, current: Combination): boolean {
  if (candidate.size !== current.size) return false;
  return compareCombinations(candidate, current) > 0;
}

function make(category: ComboCategory, cards: Card[], tail: number[]): Combination {
  return Object.freeze({
    category,
    size: cards.length,
    cards: Object.freeze(cards),
    key: Object.freeze([CATEGORY_TIER[category], ...tail]),
  });
}

function sameRank(cards: readonly Card[]): boolean {
  return cards.every((card) => card.rank === cards[0].rank);
}

function detectFiveCard(sorted: Card[]): Combination | null {
  const byRank = new Map<Rank, Card[]>();
  for (const card of sorted) {
    const group = byRank.get(card.rank);
    if (group) group.push(card);
    else byRank.set(card.rank, [card]);
  }
  const groups = [...byRank.entries()].sort((a, b) => b[1].length - a[1].length || b[0] - a[0]);

  if (groups.length === 2) {
    const [big, small] = groups;
    // 3 + 2 is a full house, 4 + 1 is a four of a kind; 4+1 sorts first by size.
    if (big[1].length === 4) return make('fourOfAKind', sorted, [big[0]]);
    if (big[1].length === 3 && small[1].length === 2) return make('fullHouse', sorted, [big[0]]);
    return null;
  }
  if (groups.length !== 5) return null;

  const run = straightRun(sorted);
  const isFlush = sorted.every((card) => card.suit === sorted[0].suit);

  if (run && isFlush) return make('straightFlush', sorted, [run.ordinal, suitIndex(run.topCard.suit)]);
  if (run) return make('straight', sorted, [run.ordinal, suitIndex(run.topCard.suit)]);
  if (isFlush) {
    const ranksDescending = sorted.map((card) => card.rank).reverse();
    return make('flush', sorted, [suitIndex(sorted[0].suit), ...ranksDescending]);
  }
  return null;
}

/**
 * Identifies the five distinct ranks in `sorted` as a straight.
 *
 * Straights run along the Big Two order 3..K, A, 2, and additionally allow the
 * two low wrap-around runs A-2-3-4-5 and 2-3-4-5-6, which are the two weakest
 * straights. `ordinal` orders every straight: A-2-3-4-5 is 0, 2-3-4-5-6 is 1,
 * 3-4-5-6-7 is 2, up to J-Q-K-A-2 at 10. `topCard` is the card that closes the
 * run and supplies the suit tie-breaker (the 5 and the 6 respectively for the
 * two wrap runs).
 */
function straightRun(sorted: readonly Card[]): { ordinal: number; topCard: Card } | null {
  const ranks = sorted.map((card) => card.rank);
  const at = (rank: Rank) => sorted.find((card) => card.rank === rank)!;

  if (isSequence(ranks, [3, 4, 5, 14, 15])) return { ordinal: 0, topCard: at(5) };
  if (isSequence(ranks, [3, 4, 5, 6, 15])) return { ordinal: 1, topCard: at(6) };

  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) return null;
  }
  // The lowest consecutive run is 3-4-5-6-7, whose top rank 7 maps to ordinal 2.
  return { ordinal: ranks[4] - 5, topCard: sorted[4] };
}

function isSequence(ranks: readonly Rank[], expected: readonly number[]): boolean {
  return ranks.every((rank, i) => rank === expected[i]);
}
