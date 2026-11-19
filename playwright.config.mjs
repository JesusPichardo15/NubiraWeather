import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 35000,
  workers: 1,
  use: {
    baseURL: process.env.NUBIRA_PUBLIC_URL || "http://localhost:3000",
    channel: process.env.NUBIRA_E2E_CHANNEL || undefined,
    viewport: { width: 1370, height: 900 },
    trace: "retain-on-failure",
  },
});
