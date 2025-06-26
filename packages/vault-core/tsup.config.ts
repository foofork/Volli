import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    entry: ['src/index.ts'],
    resolve: true,
    compilerOptions: {
      composite: false,
      incremental: false
    }
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  // Keep @automerge/automerge as external - consumers will handle WASM loading
  external: ['@automerge/automerge', 'flexsearch', 'sql.js', 'libsodium-wrappers', 'uuid', 'events'],
  target: 'es2022',
  minify: false,
  bundle: true,
  // Remove platform setting to allow both node and browser
  platform: 'neutral'
});