import { botMove, createMatch, MatchState, pass, playCards } from '@bigtwo/rules';
import { describe, expect, it } from 'vitest';
import { playerAt, seededRng } from '../helpers/simulate.js';

const PLAYERS = ['p0', 'p1', 'p2', 'p3'];

function expectOk(result: ReturnType<typeof playCards>): MatchState {
  if (!result.ok) throw new Error(`unexpected rejection: ${result.rejection.code}`);
  return result.state;
}

describe('botMove', () => {
  it('passes whenever there is a play to beat', () => {
    const state = createMatch(PLAYERS, seededRng(1));
    const leader = playerAt(state, state.turnSeat);
    const afterLead = expectOk(playCards(state, leader, [state.startingCardId!]));
    const responder = playerAt(afterLead, afterLead.turnSeat);

    expect(botMove(afterLead, responder)).toBeNull();
  });

  it('leads its weakest single rather than passing, which the rules forbid', () => {
    let state = createMatch(PLAYERS, seededRng(1));
    const leader = playerAt(state, state.turnSeat);
    state = expectOk(playCards(state, leader, [state.startingCardId!]));
    for (let i = 0; i < 3; i++) state = expectOk(pass(state, playerAt(state, state.turnSeat)));

    // The table is clear and the lead is back with the original player.
    expect(state.currentPlay).toBeNull();
    const onTurn = playerAt(state, state.turnSeat);
    const move = botMove(state, onTurn)!;

    expect(move).toEqual([state.hands[onTurn][0].id]);
    expect(pass(state, onTurn)).toMatchObject({ rejection: { code: 'cannot_pass_on_lead' } });
    expect(playCards(state, onTurn, move).ok).toBe(true);
  });

  it('opens the match with the required starting card', () => {
    const state = createMatch(PLAYERS, seededRng(1));
    const opener = playerAt(state, state.turnSeat);
    expect(botMove(state, opener)).toEqual([state.startingCardId]);
  });

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
  });
});
