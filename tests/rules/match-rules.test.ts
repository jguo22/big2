import { botMove, Card, cardValue, createMatch, MatchState, parseCardId, pass, playCards, redactMatch } from '@bigtwo/rules';
import { beforeEach, describe, expect, it } from 'vitest';
import { playerAt, seededRng } from '../helpers/simulate.js';

const PLAYERS = ['p0', 'p1', 'p2', 'p3'];

function expectOk(result: ReturnType<typeof playCards>): MatchState {
  if (!result.ok) throw new Error(`unexpected rejection: ${result.rejection.code}`);
  return result.state;
}

/** Two cards of the same rank from `hand`, or `null` if it holds no pair. */
function findPair(hand: readonly Card[]): string[] | null {
  for (let i = 1; i < hand.length; i++) {
    if (hand[i].rank === hand[i - 1].rank) return [hand[i - 1].id, hand[i].id];
  }
  return null;
}

describe('createMatch', () => {
  it('deals evenly and leaves the remainder out of play', () => {
    for (const count of [2, 3, 4]) {
      const state = createMatch(PLAYERS.slice(0, count), seededRng(count));
      const sizes = state.players.map((player) => state.hands[player.id].length);
      expect(new Set(sizes).size).toBe(1);
      expect(sizes[0] * count + state.undealt.length).toBe(52);
      expect(state.undealt.length).toBe(52 % count);
    }
  });

  it('rejects duplicate player ids', () => {
    expect(() => createMatch(['p0', 'p0'])).toThrow(RangeError);
  });

  it('starts with the holder of the 3 of Diamonds when it was dealt', () => {
    const state = createMatch(PLAYERS, seededRng(1));
    expect(state.startingCardId).toBe('3D');
    const starter = playerAt(state, state.turnSeat);
    expect(state.hands[starter].some((card) => card.id === '3D')).toBe(true);
  });

  it('falls back to the 3 of Clubs when the 3 of Diamonds is out of play', () => {
    // Three players leaves exactly one card undealt; search seeds for the deal
    // where that card happens to be the 3 of Diamonds.
    let state: MatchState | null = null;
    for (let seed = 1; seed < 3000 && !state; seed++) {
      const candidate = createMatch(PLAYERS.slice(0, 3), seededRng(seed));
      if (candidate.undealt.some((card) => card.id === '3D')) state = candidate;
    }
    expect(state).not.toBeNull();
    expect(state!.startingCardId).toBe('3C');
    const starter = playerAt(state!, state!.turnSeat);
    expect(state!.hands[starter].some((card) => card.id === '3C')).toBe(true);
  });
});

describe('turn and play validation', () => {
  let state: MatchState;
  let onTurn: string;
  let offTurn: string;

  beforeEach(() => {
    state = createMatch(PLAYERS, seededRng(1));
    onTurn = playerAt(state, state.turnSeat);
    offTurn = playerAt(state, (state.turnSeat + 1) % 4);
  });

  it('rejects a play from a player who is not on turn', () => {
    expect(playCards(state, offTurn, [state.hands[offTurn][0].id])).toMatchObject({
      ok: false,
      rejection: { code: 'not_your_turn' },
    });
  });

  it('rejects an unknown player', () => {
    expect(playCards(state, 'nobody', ['3D'])).toMatchObject({
      ok: false,
      rejection: { code: 'unknown_player' },
    });
  });

  it('rejects cards the player does not hold', () => {
    expect(playCards(state, onTurn, [state.hands[offTurn][0].id])).toMatchObject({
      ok: false,
      rejection: { code: 'cards_not_in_hand' },
    });
  });

  it('rejects an empty play', () => {
    expect(playCards(state, onTurn, [])).toMatchObject({ ok: false, rejection: { code: 'empty_play' } });
  });

  it('rejects a set of cards that is not a legal combination', () => {
    const hand = state.hands[onTurn];
    const mismatched = hand.find((card) => card.rank !== hand[0].rank)!;
    expect(playCards(state, onTurn, [hand[0].id, mismatched.id])).toMatchObject({
      ok: false,
      rejection: { code: 'invalid_combination' },
    });
  });

  it('requires the opening play to contain the starting card', () => {
    const without = state.hands[onTurn].find((card) => card.id !== '3D')!;
    expect(playCards(state, onTurn, [without.id])).toMatchObject({
      ok: false,
      rejection: { code: 'must_include_starting_card' },
    });
    expect(playCards(state, onTurn, ['3D']).ok).toBe(true);
  });

  it('rejects a pass from the player who is leading', () => {
    expect(pass(state, onTurn)).toMatchObject({ ok: false, rejection: { code: 'cannot_pass_on_lead' } });
  });

  it('rejects a play with the wrong number of cards', () => {
    // Two players hold 26 cards each, so by pigeonhole the responder must hold
    // a pair to answer the opening single with.
    const heads = createMatch(['p0', 'p1'], seededRng(1));
    const leader = playerAt(heads, heads.turnSeat);
    const opened = expectOk(playCards(heads, leader, [heads.startingCardId!]));
    const responder = playerAt(opened, opened.turnSeat);
    const pair = findPair(opened.hands[responder])!;

    expect(playCards(opened, responder, pair)).toMatchObject({
      ok: false,
      rejection: { code: 'size_mismatch' },
    });
  });

  it('rejects a single that does not beat the current play', () => {
    let current = expectOk(playCards(state, onTurn, ['3D']));
    const responder = playerAt(current, current.turnSeat);
    const responderHand = current.hands[responder];
    const strongest = responderHand[responderHand.length - 1];
    current = expectOk(playCards(current, responder, [strongest.id]));

    const third = playerAt(current, current.turnSeat);
    const lowest = current.hands[third][0];
    const result = playCards(current, third, [lowest.id]);

    if (cardValue(lowest) < cardValue(strongest)) {
      expect(result).toMatchObject({ ok: false, rejection: { code: 'too_weak' } });
    } else {
      expect(result.ok).toBe(true);
    }
  });
});

describe('rounds', () => {
  it('clears only the incoming player’s display and shows a pass from the first player', () => {
    let state: MatchState = {
      ...createMatch(PLAYERS, seededRng(1)),
      turnSeat: 0,
      hands: Object.fromEntries([
        ['p0', ['3D', '7D', 'JD']],
        ['p1', ['4D', '8D', 'QD']],
        ['p2', ['5D', '9D', 'KD']],
        ['p3', ['6D', 'TD', 'AD']],
      ].map(([id, cards]) => [id, (cards as string[]).map((id) => parseCardId(id)!)])),
    };
    state = expectOk(playCards(state, 'p0', ['3D']));
    state = expectOk(pass(state, 'p1'));
    state = expectOk(playCards(state, 'p2', ['5D']));
    expect(state.visiblePlays.map((play) => play.playerId)).toEqual(['p0', 'p2']);
    expect(state.visiblePassedSeats).toEqual([1]);
    expect(redactMatch(state, 'p3').visiblePassedSeats).toEqual([1]);

    state = expectOk(pass(state, 'p3'));
    expect(state.turnSeat).toBe(0);
    expect(state.visiblePlays).toEqual([state.currentPlay]);
    expect(state.visiblePassedSeats).toEqual([1, 3]);
    // Display clearing must not reset the consecutive passes used by the rules.
    expect(state.passedSeats).toEqual([3]);

    state = expectOk(pass(state, 'p0'));
    expect(state.visiblePassedSeats).toEqual([3, 0]);
    expect(state.visiblePlays.map((play) => play.playerId)).toEqual(['p2']);
    state = expectOk(playCards(state, 'p1', ['8D']));
    expect(state.turnSeat).toBe(2);
    expect(state.visiblePlays.map((play) => play.playerId)).toEqual(['p1']);
    expect(state.visiblePassedSeats).toEqual([3, 0]);
    state = expectOk(playCards(state, 'p2', ['9D']));
    expect(state.visiblePlays.map((play) => play.playerId)).toEqual(['p1', 'p2']);
    expect(state.visiblePassedSeats).toEqual([0]);
    state = expectOk(playCards(state, 'p3', ['TD']));
    expect(state.visiblePlays.map((play) => play.playerId)).toEqual(['p1', 'p2', 'p3']);
    expect(state.visiblePassedSeats).toEqual([]);
  });

  it('clears the leader’s cards but preserves pass markers when everyone else passes', () => {
    let state = createMatch(PLAYERS, seededRng(1));
    const leader = playerAt(state, state.turnSeat);
    state = expectOk(playCards(state, leader, ['3D']));

    for (let i = 0; i < 3; i++) {
      state = expectOk(pass(state, playerAt(state, state.turnSeat)));
    }
    expect(state.currentPlay).toBeNull();
    expect(state.passedSeats).toEqual([]);
    expect(state.roundIndex).toBe(1);
    expect(state.visiblePlays).toEqual([]);
    expect(state.visiblePassedSeats).toHaveLength(3);
    expect(state.visiblePassedSeats).not.toContain(state.turnSeat);
    expect(playerAt(state, state.turnSeat)).toBe(leader);
  });
});

describe('redactMatch', () => {
  it('shows the viewer only their own cards', () => {
    const state = createMatch(PLAYERS, seededRng(1));
    const view = redactMatch(state, 'p1');
    expect(view.yourHand.map((card) => card.id)).toEqual(state.hands.p1.map((card) => card.id));
    expect(view.handCounts.p2).toBe(13);

    // The opening card is public by design, so it is the one card of someone
    // else's hand that may legitimately appear in the view.
    const serialised = JSON.stringify(view);
    for (const card of state.hands.p2) {
      if (card.id === state.startingCardId) continue;
      expect(serialised).not.toContain(`"${card.id}"`);
    }
  });
});

describe('full match simulation', () => {
  it.each([2, 3, 4])('runs a complete %i-player match to a single winner', (count) => {
    const ids = PLAYERS.slice(0, count);
    let state = createMatch(ids, seededRng(count * 7));
    let turns = 0;

    while (!state.winnerId && turns++ < 2000) {
      const actor = playerAt(state, state.turnSeat);
      const move = botMove(state, actor);
      state = expectOk(move ? playCards(state, actor, move) : pass(state, actor));
      if (!state.winnerId) {
        expect(state.visiblePlays.some((play) => play.seat === state.turnSeat)).toBe(false);
        expect(state.visiblePassedSeats).not.toContain(state.turnSeat);
      }
    }

    expect(state.winnerId).not.toBeNull();
    expect(state.hands[state.winnerId!].length).toBe(0);
    expect(playCards(state, ids[0], ['3D'])).toMatchObject({
      ok: false,
      rejection: { code: 'match_over' },
    });
    // A 2-player deal leaves 26 cards in hand, so enumerating legal five-card
    // plays each lead is slow enough to need more than the default timeout.
  }, 60_000);
});
