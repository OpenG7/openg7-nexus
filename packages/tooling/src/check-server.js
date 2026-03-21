const DEFAULT_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200';
const DEFAULT_TIMEOUT_MS = 300_000;
const DEFAULT_INTERVAL_MS = 500;

async function waitForServer(url = DEFAULT_URL, timeoutMs = DEFAULT_TIMEOUT_MS, intervalMs = DEFAULT_INTERVAL_MS) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch (error) {
      // ignore errors and retry
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms`);
}

export default waitForServer;
