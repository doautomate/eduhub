/// <reference types="vitest" />
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // The app's fetch calls use relative paths (e.g. `/api/v1/auth/...`), which
    // resolve against whatever origin serves the frontend (localhost:3000 in
    // docker-compose.dev.yml, localhost:5173 when run directly). Without this
    // proxy those requests hit the Vite dev server itself (404) instead of the
    // FastAPI backend. VITE_API_PROXY_TARGET lets docker-compose point this at
    // the "backend" service hostname; it defaults to localhost:8000 for
    // running `npm run dev` outside of Docker.
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    // 007-fixed-app-shell-layout: unit tests assert computed CSS (flex-shrink,
    // overflow, background-color, custom property values) on AppShell regions,
    // so imported stylesheets must be injected into jsdom rather than stubbed.
    css: true,
    setupFiles: ["./tests/setupTests.ts"],
    exclude: ["**/node_modules/**", "**/tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/**/*.d.ts",
        "src/vite-env.d.ts",
        // Empty placeholder scaffolding for not-yet-built features (items/pagination) —
        // no logic exists in these files yet, so instrumenting them is meaningless.
        "src/app/client.ts",
        "src/app/interceptor.ts",
        "src/app/v1/health.ts",
        "src/app/v1/items.ts",
        "src/app/v2/**",
        "src/hooks/useApi.ts",
        "src/hooks/usePagination.ts",
        "src/middleware/request.ts",
        "src/schemas/**",
        "src/services/itemService.ts",
        "src/types/common.ts",
        "src/types/item.ts",
        "src/util/dateUtils.ts",
        "src/util/response.ts",
        "src/util/storage.ts",
        "src/util/validations.ts",
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 85,
      },
    },
  },
});
