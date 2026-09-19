import { deal, findStartingSeat, parseCardId, Rng, sortCards } from './cards/index.js';
import { beats, Combination, ComboCategory, detectCombination } from './combinations.js';
import { Card } from './types.js';

/** A seated participant in a match. Identity only; presence lives in the room layer. */
export interface MatchPlayer {
  readonly id: string;
  readonly seat: number;
}

/** One completed play, kept in the match history. */
export interface PlayRecord {
  readonly playerId: string;
  readonly seat: number;
  readonly roundIndex: number;
  readonly category: ComboCategory;
  readonly cards: readonly Card[];
}

/**
 * Full authoritative match state, including every player's hand. Never send
 * this to a client; use `redactMatch` instead.
 */
export interface MatchState {
  readonly players: readonly MatchPlayer[];
  readonly hands: Readonly<Record<string, readonly Card[]>>;
  /** Seat whose turn it is. Meaningless once `winnerId` is set. */
  readonly turnSeat: number;
  /** The play that must currently be beaten, or `null` when the turn is a free lead. */
  readonly currentPlay: PlayRecord | null;
  readonly passedSeats: readonly number[];
  readonly history: readonly PlayRecord[];
  readonly roundIndex: number;
  /** Card the very first play of the match must contain, or `null` if none applies. */
  readonly startingCardId: string | null;
  /** Cards left out of play because the deck did not divide evenly. */
  readonly undealt: readonly Card[];
  readonly winnerId: string | null;
}

/** Machine-readable reason an action was refused. */
export type RejectionCode =
  | 'match_over'
  | 'unknown_player'
  | 'not_your_turn'
  | 'empty_play'
  | 'cards_not_in_hand'
  | 'invalid_combination'
  | 'size_mismatch'
  | 'too_weak'
  | 'must_include_starting_card'
  | 'cannot_pass_on_lead';

export interface Rejection {
  readonly code: RejectionCode;
  readonly message: string;
}

/** Result of applying an action: either the next state, or a structured refusal. */
export type ActionResult = { ok: true; state: MatchState } | { ok: false; rejection: Rejection };

/** Match state as one player is allowed to see it. */
export interface PublicMatchState {
  readonly turnSeat: number;
  readonly currentPlay: PlayRecord | null;
  readonly passedSeats: readonly number[];
  /** Every play of the match so far, oldest first. */
  readonly history: readonly PlayRecord[];
  readonly roundIndex: number;
  readonly startingCardId: string | null;
  readonly winnerId: string | null;
  /** Cards remaining per player id. */
  readonly handCounts: Readonly<Record<string, number>>;
  /** The viewer's own hand, sorted ascending, or `[]` for a non-player viewer. */
  readonly yourHand: readonly Card[];
}

/**
 * Deals a new match.
 *
 * Params:
 *   playerIds: 2 to 4 distinct ids. Array order becomes seat order.
 *   rng: randomness source for the shuffle; pass a seeded generator for
 *     reproducible deals in tests.
 * Returns: a fresh MatchState with the opening seat and opening card resolved.
 * Raises: `RangeError` if the player count is outside 2..4 or ids repeat.
 */
export function createMatch(playerIds: readonly string[], rng?: Rng): MatchState {
  if (new Set(playerIds).size !== playerIds.length) {
    throw new RangeError('player ids must be distinct');
  }
  const { hands, undealt } = deal(playerIds.length, rng);
  const { seat, startingCardId } = findStartingSeat(hands);

  const handsById: Record<string, readonly Card[]> = {};
  playerIds.forEach((id, index) => {
    handsById[id] = hands[index];
  });

  return {
    players: playerIds.map((id, index) => ({ id, seat: index })),
    hands: handsById,
    turnSeat: seat,
    currentPlay: null,
    passedSeats: [],
    history: [],
    roundIndex: 0,
    startingCardId,
    undealt,
    winnerId: null,
  };
}

/**
 * Validates and applies a play.
 *
 * Params:
 *   state: current match state; not mutated.
 *   playerId: the acting player.
 *   cardIds: ids of the cards to play, in any order.
 * Returns: the next state, or a rejection explaining why the play is illegal.
 *   The match ends immediately if the play empties the player's hand.
 */
export function playCards(state: MatchState, playerId: string, cardIds: readonly string[]): ActionResult {
  const player = findActingPlayer(state, playerId);
  if ('rejection' in player) return player;
  const { seat } = player.player;

  if (cardIds.length === 0) {
    return reject('empty_play', 'Select at least one card to play.');
  }

  const hand = state.hands[playerId];
  const selected: Card[] = [];
  for (const id of cardIds) {
    const card = parseCardId(id);
    if (!card || !hand.some((held) => held.id === id) || selected.some((c) => c.id === id)) {
      return reject('cards_not_in_hand', 'Those cards are not in your hand.');
    }
    selected.push(card);
  }

  const combination = detectCombination(selected);
  if (!combination) {
    return reject('invalid_combination', 'That is not a legal combination.');
  }

  const isOpeningPlay = state.history.length === 0;
  if (isOpeningPlay && state.startingCardId && !selected.some((c) => c.id === state.startingCardId)) {
    return reject(
      'must_include_starting_card',
      `The opening play must include the ${state.startingCardId}.`,
    );
  }

  if (state.currentPlay) {
    const current = detectCombination(state.currentPlay.cards)!;
    if (combination.size !== current.size) {
      return reject('size_mismatch', `You must play exactly ${current.size} card(s).`);
    }
    if (!beats(combination, current)) {
      return reject('too_weak', 'That play does not beat the current play.');
    }
  }

  const remaining = hand.filter((card) => !cardIds.includes(card.id));
  const record: PlayRecord = {
    playerId,
    seat,
    roundIndex: state.roundIndex,
    category: combination.category,
    cards: combination.cards,
  };

  return {
    ok: true,
    state: {
      ...state,
      hands: { ...state.hands, [playerId]: remaining },
      currentPlay: record,
      passedSeats: [],
      history: [...state.history, record],
      turnSeat: nextSeat(state, seat),
      winnerId: remaining.length === 0 ? playerId : null,
    },
  };
}

/**
 * Validates and applies a pass.
 *
 * A player may not pass when leading, since nobody would ever be able to play.
 * When every other player has passed, the round closes: the played cards leave
 * play and the last player to play leads the next round.
 *
 * Params:
 *   state: current match state; not mutated.
 *   playerId: the acting player.
 * Returns: the next state, or a rejection.
 */
export function pass(state: MatchState, playerId: string): ActionResult {
  const player = findActingPlayer(state, playerId);
  if ('rejection' in player) return player;
  const { seat } = player.player;

  if (!state.currentPlay) {
    return reject('cannot_pass_on_lead', 'You are leading the round and must play.');
  }

  const passedSeats = [...state.passedSeats, seat];
  const roundIsOver = passedSeats.length >= state.players.length - 1;

  if (roundIsOver) {
    return {
      ok: true,
      state: {
        ...state,
        currentPlay: null,
        passedSeats: [],
        roundIndex: state.roundIndex + 1,
        turnSeat: state.currentPlay.seat,
      },
    };
  }

  return { ok: true, state: { ...state, passedSeats, turnSeat: nextSeat(state, seat) } };
}

/**
 * Projects match state down to what `viewerId` may see: their own hand in full,
 * everyone else's as a count only.
 *
 * Params:
 *   state: authoritative match state.
 *   viewerId: the player the view is for. An id not in the match gets an empty hand.
 * Returns: a PublicMatchState safe to send over the network.
 */
export function redactMatch(state: MatchState, viewerId: string): PublicMatchState {
  const handCounts: Record<string, number> = {};
  for (const player of state.players) {
    handCounts[player.id] = state.hands[player.id].length;
  }
  return {
    turnSeat: state.turnSeat,
    currentPlay: state.currentPlay,
    passedSeats: state.passedSeats,
    history: state.history,
    roundIndex: state.roundIndex,
    startingCardId: state.startingCardId,
    winnerId: state.winnerId,
    handCounts,
    yourHand: sortCards(state.hands[viewerId] ?? []),
  };
}

/**
 * Finds every legal play the viewer could make from their hand right now.
 * Intended for client-side hints; the server remains authoritative.
 *
 * Params:
 *   hand: the cards to search.
 *   currentPlay: the play that must be beaten, or `null` when leading.
 * Returns: every legal combination, grouped by size then discovery order.
 */
export function legalPlays(
  hand: readonly Card[],
  currentPlay: PlayRecord | null,
): Combination[] {
  const current = currentPlay ? detectCombination(currentPlay.cards) : null;
  const sizes = current ? [current.size] : [1, 2, 3, 5];
  const found: Combination[] = [];

  for (const size of sizes) {
    for (const subset of combinationsOfSize(hand, size)) {
      const combo = detectCombination(subset);
      if (combo && (!current || beats(combo, current))) found.push(combo);
    }
  }
  return found;
}

function findActingPlayer(
  state: MatchState,
  playerId: string,
): { player: MatchPlayer } | { ok: false; rejection: Rejection } {
  if (state.winnerId) return reject('match_over', 'The match is already over.');
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return reject('unknown_player', 'You are not seated in this match.');
  if (player.seat !== state.turnSeat) return reject('not_your_turn', 'It is not your turn.');
  return { player };
}

function nextSeat(state: MatchState, seat: number): number {
  return (seat + 1) % state.players.length;
}

function reject(code: RejectionCode, message: string): { ok: false; rejection: Rejection } {
  return { ok: false, rejection: { code, message } };
}

function* combinationsOfSize(cards: readonly Card[], size: number): Generator<Card[]> {
  const pick: Card[] = [];
  function* walk(start: number): Generator<Card[]> {
    if (pick.length === size) {
      yield pick.slice();
      return;
    }
    for (let i = start; i < cards.length; i++) {
      pick.push(cards[i]);
      yield* walk(i + 1);
      pick.pop();
    }
  }
  yield* walk(0);
}
