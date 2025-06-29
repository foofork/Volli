// vite.config.ts
import { sveltekit } from "file:///Users/dylantullberg/Volly/node_modules/.pnpm/@sveltejs+kit@2.22.2_@sveltejs+vite-plugin-svelte@2.5.3_svelte@4.2.20_vite@4.5.14_@type_6888580f413cf0edd0bd0f3b6f746db7/node_modules/@sveltejs/kit/src/exports/vite/index.js";
import { defineConfig } from "file:///Users/dylantullberg/Volly/node_modules/.pnpm/vite@4.5.14_@types+node@20.19.1/node_modules/vite/dist/node/index.js";
import wasm from "file:///Users/dylantullberg/Volly/node_modules/.pnpm/vite-plugin-wasm@3.4.1_vite@4.5.14_@types+node@20.19.1_/node_modules/vite-plugin-wasm/exports/import.mjs";
var vite_config_default = defineConfig({
  plugins: [sveltekit(), wasm()],
  server: {
    port: 3e3,
    host: true,
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin"
    }
  },
  worker: {
    format: "es"
  },
  define: {
    global: "globalThis"
  },
  build: {
    target: "esnext",
    sourcemap: true,
    rollupOptions: {
      external: []
    },
    assetsDir: "assets",
    copyPublicDir: true
  },
  optimizeDeps: {
    exclude: ["libsodium-wrappers", "@automerge/automerge"],
    include: ["@automerge/automerge-wasm"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvZHlsYW50dWxsYmVyZy9Wb2xseS9hcHBzL3dlYlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2R5bGFudHVsbGJlcmcvVm9sbHkvYXBwcy93ZWIvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2R5bGFudHVsbGJlcmcvVm9sbHkvYXBwcy93ZWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBzdmVsdGVraXQgfSBmcm9tICdAc3ZlbHRlanMva2l0L3ZpdGUnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgd2FzbSBmcm9tICd2aXRlLXBsdWdpbi13YXNtJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3N2ZWx0ZWtpdCgpLCB3YXNtKCldLFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiAzMDAwLFxuICAgIGhvc3Q6IHRydWUsXG4gICAgaGVhZGVyczoge1xuICAgICAgJ0Nyb3NzLU9yaWdpbi1FbWJlZGRlci1Qb2xpY3knOiAncmVxdWlyZS1jb3JwJyxcbiAgICAgICdDcm9zcy1PcmlnaW4tT3BlbmVyLVBvbGljeSc6ICdzYW1lLW9yaWdpbicsXG4gICAgfSxcbiAgfSxcbiAgd29ya2VyOiB7XG4gICAgZm9ybWF0OiAnZXMnLFxuICB9LFxuICBkZWZpbmU6IHtcbiAgICBnbG9iYWw6ICdnbG9iYWxUaGlzJyxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICB0YXJnZXQ6ICdlc25leHQnLFxuICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBleHRlcm5hbDogW10sXG4gICAgfSxcbiAgICBhc3NldHNEaXI6ICdhc3NldHMnLFxuICAgIGNvcHlQdWJsaWNEaXI6IHRydWUsXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnbGlic29kaXVtLXdyYXBwZXJzJywgJ0BhdXRvbWVyZ2UvYXV0b21lcmdlJ10sXG4gICAgaW5jbHVkZTogWydAYXV0b21lcmdlL2F1dG9tZXJnZS13YXNtJ10sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMlIsU0FBUyxpQkFBaUI7QUFDclQsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxVQUFVO0FBRWpCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO0FBQUEsRUFDN0IsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sU0FBUztBQUFBLE1BQ1AsZ0NBQWdDO0FBQUEsTUFDaEMsOEJBQThCO0FBQUEsSUFDaEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixRQUFRO0FBQUEsRUFDVjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sUUFBUTtBQUFBLEVBQ1Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxNQUNiLFVBQVUsQ0FBQztBQUFBLElBQ2I7QUFBQSxJQUNBLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxFQUNqQjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLHNCQUFzQixzQkFBc0I7QUFBQSxJQUN0RCxTQUFTLENBQUMsMkJBQTJCO0FBQUEsRUFDdkM7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
