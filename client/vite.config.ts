import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rulesEntry = fileURLToPath(new URL('../rules/src/index.ts', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Point at the rules source rather than the workspace link so Vite treats
    // it as project source: type-stripped, and hot-reloaded when it changes.
    alias: { '@bigtwo/rules': rulesEntry },
  },
  server: {
    port: 5173,
    fs: { allow: ['..'] },
  },
});
