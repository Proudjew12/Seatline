import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));
const baseURL = "http://127.0.0.1:4175";

export default defineConfig({
  testDir: "../tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  reporter: "list",
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? mkdtempSync(join(tmpdir(), "frontend-tests-")),
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    {
      name: "tablet",
      use: {
        browserName: "chromium",
        viewport: { width: 1180, height: 820 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 4175",
    cwd: frontendRoot,
    url: baseURL,
    reuseExistingServer: false,
    env: {
      VITE_APP_NAME: "Seatline",
      VITE_API_BASE_URL: "/api",
      VITE_STATIC_DEPLOYMENT: "false",
      VITE_DEV_API_PROXY_TARGET: "http://127.0.0.1:8000",
    },
  },
});
