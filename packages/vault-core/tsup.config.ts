import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  external: ['@automerge/automerge', 'flexsearch', 'sql.js', 'libsodium-wrappers', 'uuid', 'events'],
  target: 'es2022',
  minify: false,
  bundle: true
});