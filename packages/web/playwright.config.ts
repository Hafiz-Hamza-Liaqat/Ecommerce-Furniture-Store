import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.AFH_E2E_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Keep concurrency modest — shared smoke user + Vite HMR.
  workers: 2,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /customer-journey\.spec\.ts/,
    },
    {
      name: "chromium-auth",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /auth-workspace\.spec\.ts/,
      dependencies: ["chromium"],
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
      testMatch: /customer-journey\.spec\.ts/,
    },
  ],
});
