import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const reportScriptPath = resolve(__dirname, '..', 'scripts', 'generate-e2e-db-report.mjs');

function runReportScript(): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [reportScriptPath, '--mode', 'report'], {
      cwd: resolve(__dirname, '..'),
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', rejectPromise);
    child.on('exit', code => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(`DB report script exited with code ${code ?? 'unknown'}.`));
    });
  });
}

export default async function globalTeardown(): Promise<void> {
  await runReportScript();
}