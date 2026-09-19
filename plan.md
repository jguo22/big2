# Big Two Online Game Plan

## 1. Product Goal

Build an online multiplayer card game for 2 to 4 players. The objective is to be the first player to play every card in their hand.

The first release should support a complete playable match, clear rule enforcement, reconnection, and a responsive interface for desktop and mobile browsers.

## 2. Rules to Implement

### Deck and players

- Use one standard 52-card deck.
- Do not use jokers.
- Support 2, 3, or 4 players.
- Deal the deck as evenly as possible. Any unused cards remain out of play.
- Keep each player's hand private from the other players.

### Card ranking

Rank cards from highest to lowest as:

`2, A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3`

Use suits as a tie-breaker from highest to lowest:

`Spades, Hearts, Clubs, Diamonds`

The highest card is the 2 of Spades. The lowest card is the 3 of Diamonds.

### Legal combinations

Players may play one of these combination sizes:

- Single: one card.
- Pair: two cards of the same rank.
- Triple: three cards of the same rank.
- Straight: five consecutive cards, provided they are not all the same suit.
- Flush: five cards of the same suit that are not consecutive.
- Full house: three cards of one rank and two cards of another rank.
- Four of a kind: four cards of one rank plus one additional card.
- Straight flush: five consecutive cards of the same suit.

For five-card combinations, rank the combinations from weakest to strongest as straight, flush, full house, four of a kind, and straight flush. Apply the relevant highest-card or suit tie-breakers defined by the rules engine.

### Turn flow

- At the start of a round, the player holding the 3 of Diamonds begins. If that card was not dealt, the player holding the 3 of Clubs begins.
- The opening play must include the starting card and may be a single or a valid combination.
- Each following play must contain the same number of cards as the current play and must rank higher.
- A player may pass instead of playing.
- Passing does not remove a player from the round; they may play on a later turn.
- When all other players pass after a play, end the current round of plays. The cards played remain out of play.
- Start the next round with the player who made the last play. That player may lead any valid combination.
- End the match immediately when a player has no cards remaining.

## 3. Core Game Model

Define explicit domain types for:

- Player identity, connection state, seat, and ready state.
- Card rank, suit, and card identity.
- Player hand and ordered play history.
- Combination type and normalized combination strength.
- Match, round, turn, current play, passes, and winner.

Keep the authoritative match state on the server. Clients submit intentions such as play cards, pass, ready, and reconnect; the server validates them and broadcasts the resulting state.

## 4. Rules Engine

Implement the rules engine as a deterministic, independently testable module.

### Responsibilities

- Build and shuffle a standard deck.
- Deal hands fairly and determine the starting player.
- Detect and normalize every legal combination.
- Compare two combinations only when their card counts match.
- Validate that a submitted play belongs to the player's hand.
- Validate the opening-card requirement.
- Validate turn order, passes, round resets, and match completion.
- Produce structured rejection reasons for invalid actions.

### Combination comparison

Represent each combination with a comparison key rather than comparing raw card arrays. The key should encode combination category, primary rank, secondary rank where needed, and suit tie-breakers. Add focused tests for boundary cases involving 2s, ace-high and ace-low straights, flushes, full houses, four of a kinds, straight flushes, and missing starting cards.

## 5. Online Architecture

### Server

- Create a room service for creating rooms, joining by code, leaving, and starting a match.
- Use a real-time transport such as WebSockets for action submission and state updates.
- Give every action a request ID so retries are idempotent.
- Validate every action on the server; never trust client-side hand or turn state.
- Persist enough room and match state to recover from a process restart or reconnect.
- Add a heartbeat and connection timeout policy.

### Client

Build the game screen with:

- A private hand area with selectable cards.
- A table area showing the current play and recent round context.
- Player seats with names, connection status, card counts, and turn indicator.
- Play and pass controls that reflect the current selection and legal actions.
- Room creation, room joining, ready state, and match-start screens.
- Invalid-action messages and connection/reconnection states.
- A match-complete view identifying the winner and offering a new match or room exit.

The client may show locally calculated hints, but the server response is authoritative.

## 6. Suggested Project Structure

```text
plan.md
client/
  src/
    components/
    screens/
    state/
    transport/
    styles/
server/
  src/
    rooms/
    matches/
    transport/
    persistence/
rules/
  src/
    cards/
    combinations.
    match-rules.
    types.
tests/
  rules/
  integration/
```

Choose the framework and persistence layer during setup based on team familiarity and deployment constraints. Keep the rules package free of UI and network dependencies so it can be reused by the server and test tools.

## 7. Development Milestones

### Milestone 1: Rules foundation

- Define cards, ranks, suits, combinations, and comparison keys.
- Implement deck creation, shuffle, dealing, and starting-player selection.
- Add unit tests for all legal combinations and ranking boundaries.

### Milestone 2: Local match simulator

- Implement turns, plays, passes, round resets, and match completion.
- Add a command-line or test harness that can run a full match without a network.
- Test invalid cards, wrong turn, wrong combination size, insufficient strength, and invalid opening plays.

### Milestone 3: Online room flow

- Add room creation, joining, readiness, match start, and disconnect handling.
- Send server-authoritative state updates over a real-time connection.
- Add integration tests for multiple players submitting actions in sequence.

### Milestone 4: Playable interface

- Build the hand, table, player seats, action controls, room flow, and result view.
- Add responsive layouts and accessible keyboard and screen-reader interactions.
- Clearly distinguish selectable, playable, disabled, and already-played cards.

### Milestone 5: Reliability and release

- Add reconnect and state resynchronization.
- Add structured logging and error reporting.
- Test simultaneous requests, duplicate requests, refreshes, abandoned rooms, and malformed payloads.
- Deploy a staging build and run a complete match with 2, 3, and 4 players before production release.

## 8. Acceptance Criteria

- A room can host 2 to 4 connected players.
- A match deals cards correctly and identifies the correct starting player.
- Every legal combination listed above is accepted when valid.
- Illegal combinations and illegal moves are rejected consistently by the server.
- A play must beat the previous play and use the same number of cards.
- Passing, round resets, and new-round leadership behave correctly.
- A player wins as soon as their hand becomes empty.
- Players cannot see another player's cards.
- Refreshing or briefly losing the connection does not corrupt the match.
- The interface works on desktop and mobile viewport sizes.
- Automated tests cover the rules engine and the main online match flow.
