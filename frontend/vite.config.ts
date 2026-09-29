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
        // 015-frontend-coverage-tests: the previous entries here referenced pre-refactor
        // paths (src/app/*, src/hooks/*, src/schemas/**, src/services/*, src/types/*,
        // src/util/*) that no longer existed after the 012-frontend-structure-cleanup move
        // to src/shared/**, so they silently excluded nothing. The actual files they were
        // meant to cover were confirmed genuinely empty (0 lines) and unreferenced, and have
        // been deleted outright rather than re-added here — see specs/015-frontend-coverage-tests.
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
