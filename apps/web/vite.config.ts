import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [sveltekit(), wasm()],
  server: {
    port: 3000,
    host: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  worker: {
    format: 'es',
  },
  define: {
    global: 'globalThis',
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      external: [],
      output: {
        manualChunks(id) {
          // Only apply chunking for client build, not SSR
          if (id.includes('node_modules')) {
            // Heavy crypto library
            if (id.includes('libsodium-wrappers')) {
              return 'sodium';
            }
            // Automerge CRDT library
            if (id.includes('@automerge/automerge')) {
              return 'automerge';
            }
            // Other vendor libraries
            if (id.includes('uuid') || id.includes('qrcode') || 
                id.includes('dexie') || id.includes('eventemitter3')) {
              return 'vendor';
            }
          }
          // Volly packages
          if (id.includes('@volli/identity-core') || id.includes('@volli/crypto-wasm')) {
            return 'volly-crypto';
          }
          if (id.includes('@volli/vault-core')) {
            return 'volly-vault';
          }
          if (id.includes('@volli/messaging')) {
            return 'volly-messaging';
          }
        }
      }
    },
    assetsDir: 'assets',
    copyPublicDir: true,
    // Increase chunk size warning limit since we're intentionally splitting
    chunkSizeWarningLimit: 600,
  },
  optimizeDeps: {
    // Don't exclude these from optimization if we want to chunk them
    include: ['@automerge/automerge-wasm'],
  },
});
