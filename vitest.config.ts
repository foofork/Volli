import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.ts',
        '**/*.test.ts',
        '**/types.ts'
      ]
    },
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.turbo']
  },
  resolve: {
    alias: {
      '@volli/identity-core': path.resolve(__dirname, './packages/identity-core/src'),
      '@volli/vault-core': path.resolve(__dirname, './packages/vault-core/src'),
      '@volli/messaging': path.resolve(__dirname, './packages/messaging/src'),
      '@volli/sync-ipfs': path.resolve(__dirname, './packages/sync-ipfs/src'),
      '@volli/plugins': path.resolve(__dirname, './packages/plugins/src'),
      '@volli/ui-kit': path.resolve(__dirname, './packages/ui-kit/src')
    }
  }
});