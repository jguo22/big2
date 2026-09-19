import {
  botMove,
  cardValue,
  compareCombinations,
  createMatch,
  legalPlays,
  MatchState,
  pass,
  playCards,
} from '@bigtwo/rules';
import { describe, expect, it } from 'vitest';
import { playerAt, seededRng } from '../helpers/simulate.js';

const PLAYERS = ['p0', 'p1', 'p2', 'p3'];

function expectOk(result: ReturnType<typeof playCards>): MatchState {
  if (!result.ok) throw new Error(`unexpected rejection: ${result.rejection.code}`);
  return result.state;
}

/** Opens the match with the starting card and returns the resulting state. */
function opened(seed = 1): MatchState {
  const state = createMatch(PLAYERS, seededRng(seed));
  return expectOk(playCards(state, playerAt(state, state.turnSeat), [state.startingCardId!]));
}

describe('botMove', () => {
  it('opens the match with the required starting card', () => {
    const state = createMatch(PLAYERS, seededRng(1));
    expect(botMove(state, playerAt(state, state.turnSeat))).toEqual([state.startingCardId]);
  });

  it('leads its weakest single rather than passing, which the rules forbid', () => {
    let state = opened();
    for (let i = 0; i < 3; i++) state = expectOk(pass(state, playerAt(state, state.turnSeat)));

    expect(state.currentPlay).toBeNull();
    const onTurn = playerAt(state, state.turnSeat);
    const move = botMove(state, onTurn)!;

    expect(move).toEqual([state.hands[onTurn][0].id]);
    expect(pass(state, onTurn)).toMatchObject({ rejection: { code: 'cannot_pass_on_lead' } });
    expect(playCards(state, onTurn, move).ok).toBe(true);
  });

  it('plays the lowest card that beats the current play, or passes if it holds none', () => {
    let state = opened();
    const responder = playerAt(state, state.turnSeat);
    const responderHand = state.hands[responder];
    // Answer the opening 3 with a middling card, so the next bot has both
    // cards that beat it and cards that do not.
    const middling = responderHand[Math.floor(responderHand.length / 2)];
    state = expectOk(playCards(state, responder, [middling.id]));

    const third = playerAt(state, state.turnSeat);
    const hand = state.hands[third];
    const beating = hand.filter((card) => cardValue(card) > cardValue(middling));
    const move = botMove(state, third);

    if (beating.length === 0) {
      expect(move).toBeNull();
      return;
    }
    // The chosen card beats the play, and nothing weaker in hand also would.
    expect(move).toEqual([beating[0].id]);
    expect(playCards(state, third, move!).ok).toBe(true);
  });

  it('never passes while a legal play remains, and always picks the weakest one', () => {
    let state = createMatch(PLAYERS, seededRng(11));
    let turns = 0;

    while (!state.winnerId && turns++ < 2000) {
      const actor = playerAt(state, state.turnSeat);
      const move = botMove(state, actor);
      const options = candidateOptions(state, actor);

      if (move === null) {
        expect(options).toHaveLength(0);
      } else {
        expect(options.length).toBeGreaterThan(0);
        expect(move).toEqual(options[0].cards.map((card) => card.id));
      }

      state = expectOk(move ? playCards(state, actor, move) : pass(state, actor));
    }
    expect(state.winnerId).not.toBeNull();
  }, 60_000);

  it('plays a match of four bots through to a winner', () => {
    let state = createMatch(PLAYERS, seededRng(3));
    let turns = 0;

    while (!state.winnerId && turns++ < 2000) {
      const actor = playerAt(state, state.turnSeat);
      const move = botMove(state, actor);
      state = expectOk(move ? playCards(state, actor, move) : pass(state, actor));
    }

    expect(state.winnerId).not.toBeNull();
    expect(state.hands[state.winnerId!].length).toBe(0);
  }, 60_000);
});

/** Every play the bot could legally make now, weakest first. */
function candidateOptions(state: MatchState, playerId: string) {
  let options = legalPlays(state.hands[playerId], state.currentPlay);
  if (state.history.length === 0 && state.startingCardId) {
    const required = state.startingCardId;
    options = options.filter((option) => option.cards.some((card) => card.id === required));
  }
  return options.sort((a, b) => a.size - b.size || compareCombinations(a, b));
}
