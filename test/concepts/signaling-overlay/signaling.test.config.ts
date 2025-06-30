import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: 'signaling-e2e',
    include: ['test/e2e/signaling.e2e.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run tests sequentially for WebSocket stability
      },
    },
    reporters: [
      'default',
      [
        'allure-vitest',
        {
          outputDir: 'test-results/signaling',
          environmentInfo: {
            framework: 'vitest',
            runner: 'node',
            signaling: 'livekit-pq-enhanced',
          },
        },
      ],
    ],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['external/volly-signaling/pkg/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.e2e.ts'],
    },
  },
  resolve: {
    alias: {
      '@volly/crypto-wasm': resolve(__dirname, '../../packages/crypto-wasm/src'),
    },
  },
});
