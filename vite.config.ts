import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vite config runs in Node, but tsconfig does not include @types/node.
// Access process.env through globalThis to avoid TS2591.
const nodeProcess = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
const repoName = nodeProcess?.env?.GITHUB_REPOSITORY?.split('/')[1];
const base = nodeProcess?.env?.GITHUB_ACTIONS === 'true' && repoName ? `/${repoName}/` : '/';

export default defineConfig({
  base,
  plugins: [react()],
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
