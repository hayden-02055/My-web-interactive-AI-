import path from "node:path";
import { defineConfig } from "vitest/config";

// SDD-04 D-40 — unit tests for `lib/agent` and `lib/page-context` only;
// these are framework-free modules by design (§4.3), so no jsdom/React
// plugin is needed here.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
