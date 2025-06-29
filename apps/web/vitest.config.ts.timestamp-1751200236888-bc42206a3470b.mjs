// vitest.config.ts
import { defineConfig } from "file:///Users/dylantullberg/Volly/node_modules/.pnpm/vitest@3.2.4_@types+node@20.19.1_@vitest+ui@3.2.4_happy-dom@18.0.1_jsdom@23.2.0/node_modules/vitest/dist/config.js";
import { sveltekit } from "file:///Users/dylantullberg/Volly/node_modules/.pnpm/@sveltejs+kit@2.22.2_@sveltejs+vite-plugin-svelte@4.0.4_svelte@5.34.9_vite@5.4.19_@type_4d514dc422e9dc63063262b799acad42/node_modules/@sveltejs/kit/src/exports/vite/index.js";
import path from "path";
var vitest_config_default = defineConfig({
  plugins: [sveltekit()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "dist", ".svelte-kit"],
    alias: {
      "$lib": path.resolve("./src/lib"),
      "$app": path.resolve("./tests/mocks/app")
    },
    reporters: [
      [
        "default",
        {
          summary: false
        }
      ]
    ]
  },
  resolve: {
    alias: {
      "$lib": path.resolve("./src/lib"),
      "$app": path.resolve("./tests/mocks/app")
    }
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9keWxhbnR1bGxiZXJnL1ZvbGx5L2FwcHMvd2ViXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvZHlsYW50dWxsYmVyZy9Wb2xseS9hcHBzL3dlYi92aXRlc3QuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9keWxhbnR1bGxiZXJnL1ZvbGx5L2FwcHMvd2ViL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlc3QvY29uZmlnJztcbmltcG9ydCB7IHN2ZWx0ZWtpdCB9IGZyb20gJ0BzdmVsdGVqcy9raXQvdml0ZSc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3N2ZWx0ZWtpdCgpXSxcbiAgdGVzdDoge1xuICAgIGdsb2JhbHM6IHRydWUsXG4gICAgZW52aXJvbm1lbnQ6ICdqc2RvbScsXG4gICAgc2V0dXBGaWxlczogWycuL3Rlc3RzL3NldHVwLnRzJ10sXG4gICAgaW5jbHVkZTogWyd0ZXN0cy8qKi8qLnRlc3QudHMnXSxcbiAgICBleGNsdWRlOiBbJ25vZGVfbW9kdWxlcycsICdkaXN0JywgJy5zdmVsdGUta2l0J10sXG4gICAgYWxpYXM6IHtcbiAgICAgICckbGliJzogcGF0aC5yZXNvbHZlKCcuL3NyYy9saWInKSxcbiAgICAgICckYXBwJzogcGF0aC5yZXNvbHZlKCcuL3Rlc3RzL21vY2tzL2FwcCcpXG4gICAgfSxcbiAgICByZXBvcnRlcnM6IFtcbiAgICAgIFtcbiAgICAgICAgJ2RlZmF1bHQnLFxuICAgICAgICB7XG4gICAgICAgICAgc3VtbWFyeTogZmFsc2VcbiAgICAgICAgfVxuICAgICAgXVxuICAgIF1cbiAgfSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnJGxpYic6IHBhdGgucmVzb2x2ZSgnLi9zcmMvbGliJyksXG4gICAgICAnJGFwcCc6IHBhdGgucmVzb2x2ZSgnLi90ZXN0cy9tb2Nrcy9hcHAnKVxuICAgIH1cbiAgfVxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUErUixTQUFTLG9CQUFvQjtBQUM1VCxTQUFTLGlCQUFpQjtBQUMxQixPQUFPLFVBQVU7QUFFakIsSUFBTyx3QkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLFVBQVUsQ0FBQztBQUFBLEVBQ3JCLE1BQU07QUFBQSxJQUNKLFNBQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxJQUNiLFlBQVksQ0FBQyxrQkFBa0I7QUFBQSxJQUMvQixTQUFTLENBQUMsb0JBQW9CO0FBQUEsSUFDOUIsU0FBUyxDQUFDLGdCQUFnQixRQUFRLGFBQWE7QUFBQSxJQUMvQyxPQUFPO0FBQUEsTUFDTCxRQUFRLEtBQUssUUFBUSxXQUFXO0FBQUEsTUFDaEMsUUFBUSxLQUFLLFFBQVEsbUJBQW1CO0FBQUEsSUFDMUM7QUFBQSxJQUNBLFdBQVc7QUFBQSxNQUNUO0FBQUEsUUFDRTtBQUFBLFFBQ0E7QUFBQSxVQUNFLFNBQVM7QUFBQSxRQUNYO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxRQUFRLEtBQUssUUFBUSxXQUFXO0FBQUEsTUFDaEMsUUFBUSxLQUFLLFFBQVEsbUJBQW1CO0FBQUEsSUFDMUM7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
