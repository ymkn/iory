import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vite config runs in Node, but tsconfig does not include @types/node.
// Access process.env through globalThis to avoid TS2591.
const nodeProcess = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
const repoName = nodeProcess?.env?.GITHUB_REPOSITORY?.split('/')[1];
const base = nodeProcess?.env?.IORY_WEB_DEMO_BUILD === 'true' && repoName ? `/${repoName}/` : '/';

const rawArch = nodeProcess?.env?.TAURI_ENV_ARCH ?? '';
const buildArch = rawArch === 'x86_64' ? 'x64' : rawArch === 'aarch64' ? 'arm64' : rawArch || 'unknown';

export default defineConfig({
  base,
  define: {
    __BUILD_ARCH__: JSON.stringify(buildArch),
  },
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
