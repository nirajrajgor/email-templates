import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright",
  outputDir: "./verification/playwright-results",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:4173/email-templates/",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173/email-templates/",
  },
});
