export const SUITS = ['diamonds', 'clubs', 'hearts', 'spades'] as const
export type Suit = (typeof SUITS)[number]

export const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'] as const
export type Rank = (typeof RANKS)[number]

export type Card = {
  id: string
  rank: Rank
  suit: Suit
}

export type CombinationType = 'single' | 'pair' | 'triple' | 'straight' | 'flush' | 'full-house' | 'four-kind' | 'straight-flush'

export type Combination = {
  type: CombinationType
  cards: Card[]
  key: number[]
}

export type Player = {
  id: string
  name: string
  hand: Card[]
  connected: boolean
}

export type PlayedHand = {
  playerId: string
  playerName: string
  combination: Combination
}

export type MatchState = {
  players: Player[]
  currentPlayerId: string
  startingPlayerId: string
  currentPlay: PlayedHand | null
  playedHands: PlayedHand[]
  passedPlayerIds: string[]
  winnerId: string | null
}

export type ActionResult =
  | { ok: true; state: MatchState; play: PlayedHand }
  | { ok: false; reason: 'not-your-turn' | 'card-not-in-hand' | 'invalid-combination' | 'must-match-card-count' | 'not-strong-enough' | 'must-include-starting-card' | 'match-complete' }

const rankValue = (rank: Rank) => RANKS.indexOf(rank)
const suitValue = (suit: Suit) => SUITS.indexOf(suit)

export function createDeck(): Card[] {
  return RANKS.flatMap((rank) => SUITS.map((suit) => ({ id: `${rank}-${suit}`, rank, suit })))
}

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function deal(deck: Card[], playerIds: string[]): Record<string, Card[]> {
  return playerIds.reduce<Record<string, Card[]>>((hands, playerId, playerIndex) => {
    hands[playerId] = deck.filter((_, cardIndex) => cardIndex % playerIds.length === playerIndex)
    return hands
  }, {})
}

export function findCombination(cards: Card[]): Combination | null {
  if (cards.length === 0) return null
  const sorted = [...cards].sort((a, b) => rankValue(b.rank) - rankValue(a.rank) || suitValue(b.suit) - suitValue(a.suit))
  const counts = sorted.reduce<Record<string, number>>((result, card) => ({ ...result, [card.rank]: (result[card.rank] ?? 0) + 1 }), {})
  const countValues = Object.values(counts).sort((a, b) => b - a)
  const rankValues = sorted.map((card) => rankValue(card.rank)).sort((a, b) => a - b)
  const isConsecutive = rankValues.length === 5 && new Set(rankValues).size === 5 && rankValues.every((value, index) => index === 0 || value === rankValues[index - 1] + 1)
  const sameSuit = sorted.every((card) => card.suit === sorted[0].suit)

  if (cards.length === 1) return { type: 'single', cards: sorted, key: [rankValue(sorted[0].rank), suitValue(sorted[0].suit)] }
  if (cards.length === 2 && countValues[0] === 2) return { type: 'pair', cards: sorted, key: [rankValue(sorted[0].rank), suitValue(sorted[0].suit)] }
  if (cards.length === 3 && countValues[0] === 3) return { type: 'triple', cards: sorted, key: [rankValue(sorted[0].rank)] }
  if (cards.length !== 5) return null
  if (isConsecutive && sameSuit) return { type: 'straight-flush', cards: sorted, key: [rankValues[4], suitValue(sorted[0].suit)] }
  if (countValues[0] === 4) {
    const fourRank = Object.entries(counts).find(([, count]) => count === 4)?.[0] as Rank
    return { type: 'four-kind', cards: sorted, key: [rankValue(fourRank), rankValue(sorted.find((card) => counts[card.rank] === 1)?.rank ?? '3')] }
  }
  if (countValues[0] === 3 && countValues[1] === 2) {
    const tripleRank = Object.entries(counts).find(([, count]) => count === 3)?.[0] as Rank
    const pairRank = Object.entries(counts).find(([, count]) => count === 2)?.[0] as Rank
    return { type: 'full-house', cards: sorted, key: [rankValue(tripleRank), rankValue(pairRank)] }
  }
  if (sameSuit && !isConsecutive) return { type: 'flush', cards: sorted, key: sorted.flatMap((card) => [rankValue(card.rank), suitValue(card.suit)]) }
  if (isConsecutive) return { type: 'straight', cards: sorted, key: [rankValues[4], suitValue(sorted[0].suit)] }
  return null
}

const combinationStrength: Record<CombinationType, number> = {
  single: 0,
  pair: 1,
  triple: 2,
  straight: 3,
  flush: 4,
  'full-house': 5,
  'four-kind': 6,
  'straight-flush': 7,
}

export function beats(next: Combination, previous: Combination): boolean {
  if (next.cards.length !== previous.cards.length) return false
  if (combinationStrength[next.type] !== combinationStrength[previous.type]) return combinationStrength[next.type] > combinationStrength[previous.type]
  for (let index = 0; index < Math.max(next.key.length, previous.key.length); index += 1) {
    if ((next.key[index] ?? 0) !== (previous.key[index] ?? 0)) return (next.key[index] ?? 0) > (previous.key[index] ?? 0)
  }
  return false
}

export function createMatch(players: Player[]): MatchState {
  const startingPlayer = players.find((player) => player.hand.some((card) => card.id === '3-diamonds')) ?? players.find((player) => player.hand.some((card) => card.id === '3-clubs')) ?? players[0]
  return { players, currentPlayerId: startingPlayer.id, startingPlayerId: startingPlayer.id, currentPlay: null, playedHands: [], passedPlayerIds: [], winnerId: null }
}

export function playCards(state: MatchState, playerId: string, cardIds: string[]): ActionResult {
  if (state.winnerId) return { ok: false, reason: 'match-complete' }
  if (state.currentPlayerId !== playerId) return { ok: false, reason: 'not-your-turn' }
  const player = state.players.find((candidate) => candidate.id === playerId)
  if (!player || cardIds.some((id) => !player.hand.some((card) => card.id === id))) return { ok: false, reason: 'card-not-in-hand' }
  const cards = player.hand.filter((card) => cardIds.includes(card.id))
  const combination = findCombination(cards)
  if (!combination) return { ok: false, reason: 'invalid-combination' }
  if (!state.currentPlay && state.playedHands.length === 0 && !cards.some((card) => card.id === '3-diamonds' || card.id === '3-clubs')) return { ok: false, reason: 'must-include-starting-card' }
  if (state.currentPlay && !beats(combination, state.currentPlay.combination)) {
    return { ok: false, reason: combination.cards.length !== state.currentPlay.combination.cards.length ? 'must-match-card-count' : 'not-strong-enough' }
  }
  const play = { playerId, playerName: player.name, combination }
  const remaining = player.hand.filter((card) => !cardIds.includes(card.id))
  const winnerId = remaining.length === 0 ? playerId : null
  const nextIndex = (state.players.findIndex((candidate) => candidate.id === playerId) + 1) % state.players.length
  const nextState = { ...state, players: state.players.map((candidate) => candidate.id === playerId ? { ...candidate, hand: remaining } : candidate), currentPlayerId: winnerId ?? state.players[nextIndex].id, currentPlay: play, playedHands: [...state.playedHands, play], passedPlayerIds: [], winnerId }
  return { ok: true, state: nextState, play }
}

export function passTurn(state: MatchState, playerId: string): MatchState | null {
  if (state.winnerId || state.currentPlayerId !== playerId || !state.currentPlay) return null
  const passedPlayerIds = [...state.passedPlayerIds, playerId]
  const activePlayers = state.players.filter((player) => player.id !== playerId && !passedPlayerIds.includes(player.id))
  if (activePlayers.length === 0) {
    return { ...state, currentPlay: null, passedPlayerIds: [], currentPlayerId: state.currentPlay.playerId }
  }
  const nextIndex = (state.players.findIndex((player) => player.id === playerId) + 1) % state.players.length
  const nextPlayer = state.players.slice(nextIndex).concat(state.players.slice(0, nextIndex)).find((player) => player.id !== playerId && !passedPlayerIds.includes(player.id))
  return { ...state, currentPlayerId: nextPlayer?.id ?? state.currentPlay.playerId, passedPlayerIds }
}
