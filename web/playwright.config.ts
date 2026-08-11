import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// SDD-08 DD-39 — INV-01 pinned as an automated test. The server this test
// suite drives is built with `NEXT_PUBLIC_API_BASE_URL` pointed at a
// domain reserved by RFC 2606 to never resolve, so "no backend reachable"
// is real, not simulated by mocking `fetch`.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm build && pnpm exec next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_API_BASE_URL: "http://portfolio-e2e-unreachable.invalid",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
