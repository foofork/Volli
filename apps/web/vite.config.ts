import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      external: []
    }
  },
  optimizeDeps: {
    exclude: ['libsodium-wrappers']
  },
  resolve: {
    alias: {
      '@volli/integration': '/workspaces/Volli/packages/integration/dist/index.js'
    }
  }
});