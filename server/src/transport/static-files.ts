import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { createGzip } from 'node:zlib';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/**
 * Types worth compressing. Images and fonts are already compressed, and
 * gzipping them again costs CPU to make them marginally larger.
 */
const COMPRESSIBLE = /^(?:text\/|application\/json|image\/svg)/;

/**
 * Builds a handler that serves the built client from `root`.
 *
 * A request for a path that does not exist is answered with `index.html`, so
 * the single-page client survives a refresh on any URL. Vite writes hashed
 * filenames under `assets/`, so those are served as immutable; everything else
 * is revalidated on each request. Text is gzipped for clients that accept it,
 * which takes the client bundle from roughly 520KB to 150KB on the wire.
 *
 * Params:
 *   root: absolute directory holding the build output.
 * Returns: a handler for GET and HEAD requests. It answers every request it is
 *   given, including 404 when `root` holds no `index.html`.
 */
export function createClientHandler(
  root: string,
): (request: IncomingMessage, response: ServerResponse) => Promise<void> {
  return async function serveClient(request, response) {
    const { pathname } = new URL(request.url ?? '/', 'http://localhost');
    const requested = await findFile(root, pathname);
    const file = requested ?? join(root, 'index.html');

    const stream = createReadStream(file);
    stream.once('error', () => {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('not found');
    });
    stream.once('open', () => {
      const type = CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
      const gzip =
        COMPRESSIBLE.test(type) && /\bgzip\b/.test(request.headers['accept-encoding'] ?? '');

      response.writeHead(200, {
        'content-type': type,
        'cache-control': requested && pathname.startsWith('/assets/')
          ? 'public, max-age=31536000, immutable'
          : 'no-cache',
        // Set whether or not this reply is compressed, so a shared cache keeps
        // the two variants apart.
        vary: 'accept-encoding',
        ...(gzip ? { 'content-encoding': 'gzip' } : {}),
      });

      if (request.method === 'HEAD') {
        stream.destroy();
        response.end();
      } else if (gzip) stream.pipe(createGzip()).pipe(response);
      else stream.pipe(response);
    });
  };
}

/**
 * Resolves a URL path to a readable file inside `root`.
 *
 * Returns: the absolute path, or `null` when the path escapes `root`, is
 *   undecodable, or names anything but an existing file.
 */
async function findFile(root: string, pathname: string): Promise<string | null> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const candidate = resolve(join(root, normalize(decoded)));
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;

  try {
    return (await stat(candidate)).isFile() ? candidate : null;
  } catch {
    return null;
  }
}
