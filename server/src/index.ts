import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { SnapshotStore } from './persistence/store.js';
import { RoomService } from './rooms/room-service.js';
import { createClientHandler } from './transport/static-files.js';
import { attachGameSocket } from './transport/ws-server.js';

/**
 * Boots the game server: restores persisted rooms, serves a health endpoint,
 * and attaches the WebSocket transport at `/ws`.
 *
 * In production it also serves the built client from the same port, so the
 * page and its socket share one origin. In development the client is served by
 * Vite instead, and only the socket and health endpoint live here.
 *
 * Params:
 *   port: port to listen on. Defaults to the configured port; pass 0 to bind
 *     an arbitrary free port, as the tests do.
 * Returns: the bound port and a `close` function that flushes state and stops
 *   listening.
 */
export async function start(port?: number): Promise<{ port: number; close: () => Promise<void> }> {
  const config = loadConfig();
  const store = new SnapshotStore();
  const rooms = new RoomService(store);
  await rooms.restore();

  const serveClient = config.clientDir ? createClientHandler(config.clientDir) : null;

  const httpServer = createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (serveClient && (request.method === 'GET' || request.method === 'HEAD')) {
      void serveClient(request, response);
      return;
    }
    response.writeHead(404).end();
  });

  const closeSocket = attachGameSocket(httpServer, rooms);
  await new Promise<void>((resolve) => httpServer.listen(port ?? config.port, resolve));
  const address = httpServer.address();
  const boundPort = typeof address === 'object' && address ? address.port : (port ?? config.port);
  console.log(`[server] ${config.mode} — listening on port ${boundPort}, socket at /ws`);
  if (config.clientDir) console.log(`[server] serving client from ${config.clientDir}`);

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
