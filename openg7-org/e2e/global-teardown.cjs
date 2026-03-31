const { spawn } = require('node:child_process');
const { resolve } = require('node:path');

const reportScriptPath = resolve(__dirname, '..', 'scripts', 'generate-e2e-db-report.mjs');

function runReportScript() {
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

module.exports = async function globalTeardown() {
  await runReportScript();
};
