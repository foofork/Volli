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
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  worker: {
    format: 'es'
  },
  define: {
    global: 'globalThis'
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      external: []
    },
    assetsDir: 'assets',
    copyPublicDir: true
  },
  optimizeDeps: {
    exclude: ['libsodium-wrappers', '@automerge/automerge'],
    include: ['@automerge/automerge-wasm']
  },
  resolve: {
    alias: {
      '@volli/integration': '/workspaces/Volli/packages/integration/dist/index.js'
    }
  }
});