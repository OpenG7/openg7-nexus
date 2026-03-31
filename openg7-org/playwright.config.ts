import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4300';
const parsedBaseURL = new URL(baseURL);
const webServerPort = Number(parsedBaseURL.port || (parsedBaseURL.protocol === 'https:' ? '443' : '80'));

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.cjs',
  globalTeardown: './e2e/global-teardown.cjs',
  use: {
    baseURL,
  },
  webServer: {
    command: `yarn start --host ${parsedBaseURL.hostname} --port ${webServerPort}`,
    port: webServerPort,
    // Avoid reusing a stale local https dev server on the same port.
    reuseExistingServer: false,
    timeout: 300 * 1000,
  },
});
