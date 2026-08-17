import { defineConfig } from "@playwright/test";

const WEB_URL = process.env.E2E_WEB_URL ?? "http://localhost:3000";

/**
 * The api must already be running and seeded (`just seed`). Playwright starts
 * the web app itself.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: WEB_URL,
    trace: "off",
  },
  webServer: {
    // `next start` refuses to serve an output: "standalone" build, which is what
    // this app produces for Docker, so the tests run against the dev server.
    command: "npm run dev",
    url: WEB_URL,
    reuseExistingServer: true,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 180_000,
  },
});
