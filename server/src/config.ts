import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Which of the two run modes the process is in. */
export type Mode = 'development' | 'production';

export interface ServerConfig {
  readonly mode: Mode;
  /** TCP port the HTTP and WebSocket server listens on. */
  readonly port: number;
  /**
   * Directory holding the built client, served from the same port as the
   * socket. `null` in development, where Vite serves the client instead.
   */
  readonly clientDir: string | null;
}

/** Repository root, two levels up from `server/src`. */
const REPO_ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/**
 * Reads the run configuration from the environment.
 *
 * Recognised variables:
 *   NODE_ENV: `production` selects production mode; anything else (including
 *     unset) is development.
 *   PORT: listening port. Defaults to 8080.
 *   BIGTWO_CLIENT_DIR: directory of the built client. Defaults to
 *     `client/dist` in the repository. Production only; set it to an empty
 *     string to run the socket alone, with the client hosted elsewhere.
 *
 * Returns: the resolved configuration. Paths are absolute.
 */
export function loadConfig(): ServerConfig {
  const mode: Mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  return {
    mode,
    port: Number(process.env.PORT ?? 8080),
    clientDir: mode === 'production' ? resolveClientDir() : null,
  };
}

/**
 * Locates the built client for production, warning when it is missing.
 *
 * Returns: an absolute directory, or `null` when the client is hosted
 *   elsewhere or has not been built.
 */
function resolveClientDir(): string | null {
  const configured = process.env.BIGTWO_CLIENT_DIR;
  if (configured === '') return null;
  const dir = configured ? resolve(configured) : resolve(REPO_ROOT, 'client/dist');
  if (existsSync(dir)) return dir;
  console.warn(`[server] no client bundle at ${dir} — run "npm run build". Serving the socket only.`);
  return null;
}
