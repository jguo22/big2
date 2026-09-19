/**
 * Core domain types for Big Two. Pure data: no UI, no network, no I/O.
 */

/** Suits, lowest to highest. */
export type Suit = 'D' | 'C' | 'H' | 'S';

/** Suits in ascending strength order. Index into this array is the suit's rank. */
export const SUIT_ORDER: readonly Suit[] = ['D', 'C', 'H', 'S'] as const;

/**
 * Card rank as a comparable number. 3 is lowest; 14 is Ace; 15 is the 2,
 * which is the highest rank in Big Two.
 */
export type Rank = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

/** Ranks in ascending strength order. */
export const RANK_ORDER: readonly Rank[] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;

/** Human-readable rank labels for display. */
export const RANK_LABEL: Record<Rank, string> = {
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
  15: '2',
};

/** Single-character rank codes used inside card ids ('T' stands for 10). */
export const RANK_CODE: Record<Rank, string> = {
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: 'T',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
  15: '2',
};

/** Display glyphs for each suit. */
export const SUIT_GLYPH: Record<Suit, string> = {
  D: '♦',
  C: '♣',
  H: '♥',
  S: '♠',
};

/**
 * A single playing card. `id` is the stable identity used across the wire,
 * formed as `RANK_CODE[rank] + suit` (e.g. `"3D"`, `"TS"`, `"2S"`).
 */
export interface Card {
  readonly id: string;
  readonly rank: Rank;
  readonly suit: Suit;
}

/** Id of the lowest card in the deck, which opens a match when it was dealt. */
export const THREE_OF_DIAMONDS = '3D';

/** Id of the fallback opening card, used when the 3 of Diamonds is out of play. */
export const THREE_OF_CLUBS = '3C';
