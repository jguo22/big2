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

The server has two modes, selected by `NODE_ENV`. They differ in one thing:
who serves the client.

| | Development | Production |
| --- | --- | --- |
| Client | Vite dev server on `:5173`, hot reloading | Built bundle, served by the game server |
| Socket | `ws://localhost:8080/ws` | `/ws` on the page's own origin |
| Command | `npm run dev` | `npm run build && npm start` |

### Development

```sh
npm run dev
```

Starts the game server on port 8080 and the Vite dev server on
`http://localhost:5173`. Editing anything under `client/src` or `rules/src`
hot-reloads the browser; editing `server/src` restarts the server via
`tsx watch`.

To run them separately:

```sh
npm run dev:server
npm run dev:client
```

Enter a name, then pick a room from the browser or create your own. Open the
client in two or more browser tabs (or devices on the same network) to play
together, or add bots from the room and play alone.

### Production

```sh
npm run build   # client/dist
npm start       # one process: client + socket on port 8080
```

One process serves both the page and the socket, so they always share an
origin and there is no CORS or mixed-content configuration to get wrong. Open
`http://localhost:8080` to check a production build locally.

Configuration is environment-only:

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `8080` | Port for both the page and the socket. |
| `BIGTWO_CLIENT_DIR` | `client/dist` | Where the built client lives. Set it empty to serve the socket alone. |
| `BIGTWO_STATE_PATH` | `.data/state.json` | Snapshot file, relative to the working directory. |

Point the client at a server other than its own origin by baking a URL into
the build — it is a build-time value, not a runtime one:

```sh
VITE_WS_URL=ws://192.168.1.20:8080/ws npm run dev:client
VITE_WS_URL=wss://game.example.com/ws npm run build
```

## Deploy to EC2

Open port 8080 to the world in the instance's security group, and **allocate
an Elastic IP** — a stopped instance otherwise comes back on a different
address.

Once, on a fresh instance:

```sh
deploy/setup.sh ec2-user@<elastic-ip>
```

That installs Node, npm and rsync — via `dnf` or `apt-get`, whichever the box
has — and installs the systemd unit, rewritten for the user and directory you
deploy as, so `ubuntu` works as well as `ec2-user`. It leaves the service
enabled but not started, since the first deploy is what starts it.

Then deploy from your machine:

```sh
deploy/deploy.sh ec2-user@<elastic-ip>
```

The upload lands in `~/bigtwo` on the instance, creating it if needed.

The client is built locally and only the result is uploaded, so the instance
never runs Vite — which matters, because a build wants more than the 1GB a
`t3.micro` has and gets killed part-way through. The box runs
`npm ci --omit=dev`, which skips the build tooling — Vite, TypeScript, Vitest.
It still pulls the client's React dependencies, since npm cannot tell they are
already compiled into the bundle; that is some 40MB of packages nothing loads,
which is not worth working around.

Every later deploy is just `deploy/deploy.sh ec2-user@<elastic-ip>` again; the
script restarts the service itself. `journalctl -u bigtwo -f` follows the log.

Rooms and sessions snapshot to `.data/state.json` on the instance, which the
upload deliberately leaves alone, so a deploy does not end a match in
progress.

Building on the box instead is possible — `git clone`, `npm ci`,
`npm run build` — but needs swap added first, or the build is OOM-killed with
nothing but `Killed` in the output.

### Serving it over HTTPS

Plain `http://<ip>:8080` works, but is unencrypted and warned about by
browsers. Since the page and socket share an origin, a single CloudFront
distribution in front of the instance upgrades both at once: set the origin to
the instance's public DNS name on port 8080, allow all HTTP methods, forward
all headers for the `/ws` behaviour, and disable caching on it. That yields
`https://<id>.cloudfront.net` with a trusted certificate and working `wss://`,
without owning a domain.

With a domain, the alternative is nginx on the instance terminating TLS from
Let's Encrypt and proxying to port 8080 — remembering `proxy_set_header
Upgrade` and `Connection` so the socket upgrade survives the hop.

## Rooms

The browser lists every room on the server with its name, host, player count
and whether it is public or private. Private rooms are listed like any other —
seeing that a game exists is harmless; joining one needs the password the host
set when creating it.

Passwords are stored as salted scrypt hashes, never as plaintext and never in
the snapshot on disk, and no room summary or room view ever carries password
material. A player already seated skips the check, so a reconnect or refresh
never has to re-enter it.

## Test

```sh
npm test          # rules unit tests + socket integration tests
npm run typecheck # tsc across all three workspaces
```

## Bots

The host can fill empty seats with bots from the lobby, up to four players
total. Bots are always ready, hold no session, and receive no broadcasts.

A bot plays the lowest combination it legally can, and passes only when it
holds nothing that beats the current play. "Lowest" orders plays by card count
first and then by comparison key, so a bot spends its weakest cards first.

A leading bot always plays, because the rules forbid passing on a lead and
nobody could ever play if they did not. Bot turns resolve synchronously, so one
action produces one broadcast.

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
