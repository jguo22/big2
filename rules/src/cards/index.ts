import {
  Card,
  RANK_CODE,
  RANK_ORDER,
  Rank,
  SUIT_ORDER,
  Suit,
  THREE_OF_CLUBS,
  THREE_OF_DIAMONDS,
} from '../types.js';

/** A function returning a float in [0, 1). Injectable so deals can be made deterministic. */
export type Rng = () => number;

/**
 * Absolute strength of a card: rank first, suit as tie-breaker.
 *
 * Returns: an integer that is strictly ordered across the whole deck, so
 * `cardValue(a) > cardValue(b)` means `a` beats `b` as a single.
 */
export function cardValue(card: Card): number {
  return card.rank * 4 + SUIT_ORDER.indexOf(card.suit);
}

/** Ascending strength index of a suit (0 for Diamonds, 3 for Spades). */
export function suitIndex(suit: Suit): number {
  return SUIT_ORDER.indexOf(suit);
}

/**
 * Builds a card from its id.
 *
 * Params:
 *   id: a two-character card id such as `"3D"`, `"TS"` or `"2S"`.
 * Returns: the matching Card, or `null` if the id is not a real card.
 */
export function parseCardId(id: string): Card | null {
  return CARDS_BY_ID.get(id) ?? null;
}

/**
 * Returns a fresh, ordered 52-card deck (no jokers). The returned array is a
 * new array each call; the Card objects themselves are shared and frozen.
 */
export function createDeck(): Card[] {
  return FULL_DECK.slice();
}

/**
 * Shuffles a copy of `cards` using Fisher-Yates.
 *
 * Params:
 *   cards: source cards; not mutated.
 *   rng: source of randomness in [0, 1). Defaults to `Math.random`. Pass a
 *     seeded generator to make a deal reproducible in tests.
 * Returns: a new shuffled array.
 */
export function shuffle(cards: readonly Card[], rng: Rng = Math.random): Card[] {
  const out = cards.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Deals a shuffled deck as evenly as possible.
 *
 * Params:
 *   playerCount: 2, 3 or 4.
 *   rng: randomness source passed through to `shuffle`.
 * Returns: `hands` (one sorted ascending hand per player, in seat order) and
 *   `undealt` (the remainder, which stays out of play for the whole match).
 * Raises: `RangeError` if `playerCount` is outside 2..4.
 */
export function deal(playerCount: number, rng: Rng = Math.random): { hands: Card[][]; undealt: Card[] } {
  if (!Number.isInteger(playerCount) || playerCount < 2 || playerCount > 4) {
    throw new RangeError(`playerCount must be an integer in 2..4, got ${playerCount}`);
  }
  const deck = shuffle(createDeck(), rng);
  const perPlayer = Math.floor(deck.length / playerCount);
  const hands: Card[][] = [];
  for (let seat = 0; seat < playerCount; seat++) {
    hands.push(sortCards(deck.slice(seat * perPlayer, (seat + 1) * perPlayer)));
  }
  return { hands, undealt: deck.slice(perPlayer * playerCount) };
}

/**
 * Picks the seat that opens the match and the card that opening play must contain.
 *
 * The 3 of Diamonds leads; if it was left out of play, the 3 of Clubs leads.
 * If neither was dealt, seat 0 leads and no card is required.
 *
 * Params:
 *   hands: one hand per seat, in seat order.
 * Returns: the leading `seat` and the required `startingCardId`, or `null` for
 *   `startingCardId` when no opening card constraint applies.
 */
export function findStartingSeat(hands: readonly (readonly Card[])[]): {
  seat: number;
  startingCardId: string | null;
} {
  for (const cardId of [THREE_OF_DIAMONDS, THREE_OF_CLUBS]) {
    const seat = hands.findIndex((hand) => hand.some((card) => card.id === cardId));
    if (seat !== -1) return { seat, startingCardId: cardId };
  }
  return { seat: 0, startingCardId: null };
}

/**
 * Sorts cards by ascending strength (rank, then suit).
 *
 * Params:
 *   cards: source cards; not mutated.
 * Returns: a new sorted array.
 */
export function sortCards(cards: readonly Card[]): Card[] {
  return cards.slice().sort((a, b) => cardValue(a) - cardValue(b));
}

function buildCard(rank: Rank, suit: Suit): Card {
  return Object.freeze({ id: RANK_CODE[rank] + suit, rank, suit });
}

const FULL_DECK: readonly Card[] = Object.freeze(
  RANK_ORDER.flatMap((rank) => SUIT_ORDER.map((suit) => buildCard(rank, suit))),
);

const CARDS_BY_ID = new Map<string, Card>(FULL_DECK.map((card) => [card.id, card]));
