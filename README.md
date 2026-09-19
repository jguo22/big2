# Big Two

Online Big Two for 2–4 players, implementing [plan.md](plan.md).

## Layout

| Workspace | What it holds |
| --- | --- |
| `rules/` | Deterministic rules engine, bot policy, and the wire protocol types. No UI, no network, no I/O. |
| `server/` | Node + `ws` server. Owns all authoritative state: rooms, sessions, matches. |
| `client/` | Vite + React + Tailwind v4 + Chakra UI v3. Renders whatever the server broadcasts. |
| `tests/` | `tests/rules` unit tests, `tests/integration` end-to-end socket tests. |

The server is the only authority. Clients submit intentions (`play`, `pass`,
`add_bot`, …); the server validates each one against the rules engine and
broadcasts a per-player redacted view, so no client ever receives another
player's cards.

## Setup

```sh
npm install
```

Installs all three workspaces and links `@bigtwo/rules` into the server and client.

## Run it

```sh
npm run dev
```

Starts the game server on `ws://localhost:8080` and the Vite dev server (with
hot module reloading) on `http://localhost:5173`. Editing anything under
`client/src` or `rules/src` hot-reloads the browser; editing `server/src`
restarts the server via `tsx watch`.

To run them separately:

```sh
npm run dev:server
npm run dev:client
```

Open the client in two or more browser tabs (or devices on the same network),
create a room in one, and join with the 4-character code in the others. Or add
bots from the lobby and play alone.

Point the client at a different server with `VITE_WS_URL`:

```sh
VITE_WS_URL=ws://192.168.1.20:8080 npm run dev:client
```

## Test

```sh
npm test          # rules unit tests + socket integration tests
npm run typecheck # tsc across all three workspaces
```

## Bots

The host can fill empty seats with bots from the lobby, up to four players
total. Bots are always ready, hold no session, and receive no broadcasts.

The current policy is to pass whenever there is a play to beat. A bot that is
leading cannot pass — the rules forbid it, and nobody could ever play if they
could — so a leading bot plays its weakest single instead. Bot turns resolve
synchronously, so one action produces one broadcast.

## Rules decisions

`plan.md` leaves a few tie-breakers to the rules engine. This implementation:

- Ranks cards `3 … K, A, 2` with suits `D < C < H < S`, so the 2 of Spades is
  the highest card and the 3 of Diamonds the lowest.
- Allows the two wrap-around straights `A-2-3-4-5` and `2-3-4-5-6`, ranked as the
  two weakest straights, below `3-4-5-6-7`.
- Breaks straight and straight-flush ties on the suit of the card that closes
  the run.
- Compares flushes by suit first, then by card ranks from the top down.
- Forbids passing when you are leading a round, since nobody could ever play.
- Ends a match the moment a hand becomes empty.

## Reliability

- Every client action carries a `requestId`; a repeated id replays the original
  reply instead of applying the action twice.
- Rooms and sessions snapshot to `server/.data/state.json`, so a restart does
  not lose a match in progress.
- The client reconnects with exponential backoff and re-sends `hello` with its
  stored session id to reclaim its seat; queued actions flush on reconnect.
- The server pings every socket every 15s and drops one that misses two pings,
  marking the player offline without freeing their seat.
- Rooms with no connected player for 30 minutes are swept away.
