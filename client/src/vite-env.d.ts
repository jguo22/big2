/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** WebSocket URL of the game server. Defaults to port 8080 on the current host. */
  readonly VITE_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
