/**
 * Fills a running server with rooms, so the room browser can be worked on
 * without hand-creating them.
 *
 * This is a standalone fake client: it opens WebSocket connections and sends
 * the same messages a browser would. It imports nothing from the workspaces
 * and the server has no idea it is a script, so nothing here can leak into
 * the product.
 *
 * Rooms are created over WebSocket rather than HTTP because that is the only
 * way to create one — the server exposes no HTTP route for it.
 *
 * Needs Node 22+ for the global WebSocket. Run it against a live server:
 *
 *   node scripts/seed-rooms.mjs
 *   BIGTWO_WS_URL=ws://127.0.0.1:9000/ws node scripts/seed-rooms.mjs
 */

const URL = process.env.BIGTWO_WS_URL ?? 'ws://127.0.0.1:8080/ws';
const TIMEOUT_MS = 5000;

/**
 * @typedef {object} Seed
 * @property {string} host    Display name of the room's creator.
 * @property {string} room    Room name shown in the browser.
 * @property {string} password Blank leaves the room public.
 * @property {number} bots    Bots the host adds, which varies the player count.
 * @property {boolean} [start] Deals immediately, so the room shows as in play.
 */

/** @type {Seed[]} */
const SEEDS = [
  { host: 'Mina', room: 'Sunday night cards', password: '', bots: 2 },
  { host: 'Owen', room: 'Beginner table', password: 'letmein', bots: 1 },
  { host: 'Sofia', room: 'The green room', password: '', bots: 0 },
  { host: 'Jae', room: 'Deuces wild', password: '', bots: 3 },
  { host: 'Priya', room: 'Late shift', password: 'hunter2', bots: 2 },
  { host: 'Tomas', room: 'Kitchen table', password: '', bots: 1 },
  { host: 'Ada', room: 'Lunch break', password: '', bots: 2, start: true },
  { host: 'Rio', room: 'Big two or bust', password: 'cards', bots: 0 },
  { host: 'Nour', room: 'Casual only', password: '', bots: 1 },
  { host: 'Kit', room: 'Final table', password: '', bots: 3, start: true },
];

/**
 * Opens a socket and waits for it to connect.
 *
 * @param {string} url
 * @returns {Promise<WebSocket>}
 */
function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timer = setTimeout(() => reject(new Error(`could not reach ${url}`)), TIMEOUT_MS);
    socket.addEventListener('open', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error(`could not reach ${url} — is the server running?`));
    });
  });
}

/**
 * Sends one message and waits for the reply carrying the same request id.
 *
 * @param {WebSocket} socket
 * @param {object} message Client message, without its requestId.
 * @param {string} expect  Reply `type` to wait for.
 * @returns {Promise<any>} The matching reply.
 */
function request(socket, message, expect) {
  const requestId = `seed-${Math.random().toString(36).slice(2, 10)}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.removeEventListener('message', onMessage);
      reject(new Error(`timed out waiting for ${expect}`));
    }, TIMEOUT_MS);

    const onMessage = (event) => {
      const reply = JSON.parse(event.data);
      if (reply.requestId !== requestId) return;
      clearTimeout(timer);
      socket.removeEventListener('message', onMessage);
      if (reply.type === 'error') reject(new Error(`${reply.code}: ${reply.message}`));
      else if (reply.type === expect) resolve(reply);
      else reject(new Error(`expected ${expect}, got ${reply.type}`));
    };

    socket.addEventListener('message', onMessage);
    socket.send(JSON.stringify({ ...message, requestId }));
  });
}

/**
 * Creates one room, leaving its host socket open until seeding finishes.
 *
 * @param {Seed} seed
 * @returns {Promise<WebSocket>} The host's socket.
 */
async function seedRoom(seed) {
  const socket = await connect(URL);
  await request(socket, { type: 'hello', sessionId: null, name: seed.host }, 'welcome');

  const created = await request(
    socket,
    { type: 'create_room', name: seed.room, password: seed.password },
    'room',
  );

  for (let i = 0; i < seed.bots; i++) await request(socket, { type: 'add_bot' }, 'room');
  if (seed.start) await request(socket, { type: 'start_match' }, 'room');

  const lock = seed.password ? 'private' : 'public';
  const state = seed.start ? 'in play' : 'waiting';
  console.log(
    `  ${created.room.code}  ${seed.room.padEnd(22)} ${lock.padEnd(8)} ${seed.bots + 1} players, ${state}`,
  );
  return socket;
}

async function main() {
  console.log(`Seeding ${SEEDS.length} rooms on ${URL}\n`);
  const sockets = [];

  for (const seed of SEEDS) {
    try {
      sockets.push(await seedRoom(seed));
    } catch (error) {
      console.error(`  failed to seed "${seed.room}": ${error.message}`);
    }
  }

  // Hosts disconnect now that seeding is done. Their seats are held, so the
  // rooms stay listed until the server's abandoned-room sweep clears them.
  for (const socket of sockets) socket.close();
  console.log(`\nDone. ${sockets.length} of ${SEEDS.length} rooms created.`);
}

main().catch((error) => {
  console.error('seeding failed:', error.message);
  process.exit(1);
});
