import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: 'http://localhost:4200',
  },
  webServer: {
    command: 'yarn start',
    port: 4200,
    // Avoid reusing a stale local https dev server on the same port.
    reuseExistingServer: false,
    timeout: 300 * 1000,
  },
});
