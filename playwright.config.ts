import { defineConfig } from "@playwright/test";
export default defineConfig({
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3011",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
  },
  webServer: {
    command: "npm run start -- --port 3011",
    url: "http://localhost:3011",
    reuseExistingServer: false,
    timeout: 30000,
    env: {
      OURA_CLIENT_ID: "",
      OURA_CLIENT_SECRET: "",
      OURA_REDIRECT_URI: "http://localhost:3011/api/auth/callback",
      PUBLIC_SITE_URL: "http://localhost:3011",
    },
  },
});
