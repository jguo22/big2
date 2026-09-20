/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * WebSocket URL of the game server, overriding the default. Defaults to
   * `/ws` on the page's own origin in production, and to port 8080 on the
   * current host in development.
   */
  readonly VITE_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
