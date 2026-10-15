import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["json", { outputFile: "reports/e2e-results.json" }]],
  use: { baseURL: "http://127.0.0.1:4173", reducedMotion: "reduce" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: { command: "node tests/static-server.mjs", url: "http://127.0.0.1:4173/index.html", reuseExistingServer: !process.env.CI },
});
