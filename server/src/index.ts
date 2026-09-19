import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SnapshotStore } from './persistence/store.js';
import { RoomService } from './rooms/room-service.js';
import { attachGameSocket } from './transport/ws-server.js';

const PORT = Number(process.env.PORT ?? 8080);

/**
 * Boots the game server: restores persisted rooms, serves a health endpoint,
 * and attaches the WebSocket transport.
 *
 * Returns: a `close` function that flushes state and stops listening. Useful
 *   for tests, which call it to tear the server down.
 */
export async function start(port = PORT): Promise<{ port: number; close: () => Promise<void> }> {
  const store = new SnapshotStore();
  const rooms = new RoomService(store);
  await rooms.restore();

  const httpServer = createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    response.writeHead(404).end();
  });

  const closeSocket = attachGameSocket(httpServer, rooms);
  await new Promise<void>((resolve) => httpServer.listen(port, resolve));
  const address = httpServer.address();
  const boundPort = typeof address === 'object' && address ? address.port : port;
  console.log(`[server] listening on ws://localhost:${boundPort}`);

  return {
    port: boundPort,
    close: async () => {
      await closeSocket();
      await store.flush();
      await new Promise<void>((resolve, reject) =>
        httpServer.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

const isEntrypoint = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  const server = await start();
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      void server.close().then(() => process.exit(0));
    });
  }
}
