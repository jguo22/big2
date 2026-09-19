import { beats, Card, Combination, compareCombinations, detectCombination, parseCardId } from '@bigtwo/rules';
import { describe, expect, it } from 'vitest';

/** Builds a hand from card ids, e.g. `hand('3D', 'TS')`. */
function hand(...ids: string[]): Card[] {
  return ids.map((id) => {
    const card = parseCardId(id);
    if (!card) throw new Error(`no such card: ${id}`);
    return card;
  });
}

/** Detects a combination, failing the test if the cards are not legal. */
function combo(...ids: string[]): Combination {
  const detected = detectCombination(hand(...ids));
  if (!detected) throw new Error(`not a legal combination: ${ids.join(' ')}`);
  return detected;
}

describe('card ranking', () => {
  it('ranks the 2 of Spades above every other card', () => {
    expect(beats(combo('2S'), combo('2H'))).toBe(true);
    expect(beats(combo('2D'), combo('AS'))).toBe(true);
    expect(beats(combo('3D'), combo('3C'))).toBe(false);
  });
});

describe('detectCombination', () => {
  it('recognises each legal shape', () => {
    expect(combo('9H').category).toBe('single');
    expect(combo('9H', '9S').category).toBe('pair');
    expect(combo('9H', '9S', '9C').category).toBe('triple');
    expect(combo('3D', '4C', '5H', '6S', '7D').category).toBe('straight');
    expect(combo('3D', '5D', '7D', '9D', 'JD').category).toBe('flush');
    expect(combo('9H', '9S', '9C', '4D', '4H').category).toBe('fullHouse');
    expect(combo('9H', '9S', '9C', '9D', '4H').category).toBe('fourOfAKind');
    expect(combo('3D', '4D', '5D', '6D', '7D').category).toBe('straightFlush');
  });

  it('rejects shapes the rules do not allow', () => {
    expect(detectCombination(hand('9H', '8S'))).toBeNull();
    expect(detectCombination(hand('9H', '9S', '8C'))).toBeNull();
    expect(detectCombination(hand('9H', '9S', '8C', '8D'))).toBeNull();
    expect(detectCombination(hand('9H', '9S', '9C', '8D', '7D'))).toBeNull();
    expect(detectCombination([])).toBeNull();
  });

  it('rejects a repeated card', () => {
    const three = parseCardId('3D')!;
    expect(detectCombination([three, three])).toBeNull();
  });
});

describe('straight boundaries', () => {
  it('accepts the ace-high straight and the J-Q-K-A-2 straight', () => {
    expect(combo('TD', 'JC', 'QH', 'KS', 'AD').category).toBe('straight');
    expect(combo('JC', 'QH', 'KS', 'AD', '2C').category).toBe('straight');
  });

  it('orders the two low wrap straights below every other straight', () => {
    const wheel = combo('AD', '2C', '3H', '4S', '5D');
    const lowSix = combo('2C', '3H', '4S', '5D', '6H');
    const lowest = combo('3D', '4C', '5H', '6S', '7D');
    expect(beats(lowSix, wheel)).toBe(true);
    expect(beats(lowest, lowSix)).toBe(true);
  });

  it('breaks straight ties on the suit of the closing card', () => {
    expect(beats(combo('3D', '4C', '5H', '6S', '7S'), combo('3H', '4S', '5C', '6D', '7D'))).toBe(true);
  });
});

describe('five-card category order', () => {
  const straight = combo('3D', '4C', '5H', '6S', '7D');
  const flush = combo('3D', '5D', '7D', '9D', 'JD');
  const fullHouse = combo('4H', '4S', '4C', '3D', '3H');
  const fourKind = combo('4H', '4S', '4C', '4D', '3H');
  const straightFlush = combo('3D', '4D', '5D', '6D', '7D');

  it('ranks straight < flush < full house < four of a kind < straight flush', () => {
    const ascending = [straight, flush, fullHouse, fourKind, straightFlush];
    for (let i = 1; i < ascending.length; i++) {
      expect(beats(ascending[i], ascending[i - 1])).toBe(true);
      expect(beats(ascending[i - 1], ascending[i])).toBe(false);
    }
  });

  it('compares flushes by suit first, then by high card', () => {
    expect(beats(combo('3S', '5S', '7S', '9S', 'JS'), combo('4D', '6D', '8D', 'TD', 'QD'))).toBe(true);
    expect(beats(combo('4D', '6D', '8D', 'TD', 'QD'), combo('3D', '5D', '7D', '9D', 'JD'))).toBe(true);
  });

  it('compares full houses by the triple and quads by the four', () => {
    expect(beats(combo('5H', '5S', '5C', 'AD', 'AH'), combo('4H', '4S', '4C', '2D', '2H'))).toBe(true);
    expect(beats(combo('5H', '5S', '5C', '5D', '3H'), combo('4H', '4S', '4C', '4D', 'AH'))).toBe(true);
  });
});

describe('compareCombinations', () => {
  it('refuses to compare different card counts', () => {
    expect(() => compareCombinations(combo('9H'), combo('9H', '9S'))).toThrow(RangeError);
    expect(beats(combo('9H'), combo('9H', '9S'))).toBe(false);
  });
});
