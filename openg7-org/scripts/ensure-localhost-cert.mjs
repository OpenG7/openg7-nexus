import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import selfsigned from 'selfsigned';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, '..');
const certDir = resolve(workspaceRoot, '.cert');
const certPath = resolve(certDir, 'localhost.pem');
const keyPath = resolve(certDir, 'localhost-key.pem');
const metaPath = resolve(certDir, 'localhost.meta.json');

mkdirSync(certDir, { recursive: true });

const mkcertCommand = resolveMkcertCommand();
const mkcertInstalled = Boolean(mkcertCommand);
const currentProvider = readProviderMetadata();

if (hasFile(certPath) && hasFile(keyPath)) {
  if (mkcertInstalled && currentProvider !== 'mkcert') {
    removeExistingCertificate();
    createTrustedCertificateWithMkcert();
    process.exit(0);
  }

  console.log(`[https] Reusing existing localhost certificate in ${certDir}`);
  process.exit(0);
}

if (mkcertInstalled) {
  createTrustedCertificateWithMkcert();
  process.exit(0);
}

createSelfSignedCertificate();
process.exit(0);

function hasFile(path) {
  try {
    return statSync(path).isFile() && statSync(path).size > 0;
  } catch {
    return false;
  }
}

function createTrustedCertificateWithMkcert() {
  console.log('[https] mkcert detected, generating a trusted localhost certificate');
  runMkcert(['-install']);
  runMkcert([
    '-cert-file',
    certPath,
    '-key-file',
    keyPath,
    'localhost',
    '127.0.0.1',
    '::1',
  ]);
  writeProviderMetadata('mkcert');
  console.log(`[https] Trusted certificate written to ${certDir}`);
}

function runMkcert(args) {
  const result = spawnSync(mkcertCommand, args, {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    const details = stderr || stdout || `mkcert exited with code ${result.status}`;
    throw new Error(details);
  }
}

function createSelfSignedCertificate() {
  console.log('[https] mkcert not found, generating a self-signed localhost certificate');
  const pems = selfsigned.generate(
    [{ name: 'commonName', value: 'localhost' }],
    {
      algorithm: 'sha256',
      days: 30,
      keySize: 2048,
      extensions: [
        {
          name: 'basicConstraints',
          cA: false,
        },
        {
          name: 'keyUsage',
          digitalSignature: true,
          keyEncipherment: true,
        },
        {
          name: 'extKeyUsage',
          serverAuth: true,
        },
        {
          name: 'subjectAltName',
          altNames: [
            { type: 2, value: 'localhost' },
            { type: 7, ip: '127.0.0.1' },
            { type: 7, ip: '::1' },
          ],
        },
      ],
    }
  );

  writeFileSync(certPath, `${pems.cert}\n`, 'utf8');
  writeFileSync(keyPath, `${pems.private}\n`, 'utf8');
  writeProviderMetadata('selfsigned');

  console.warn('[https] Browser trust will still warn until you install mkcert and regenerate the cert.');
  console.warn('[https] Run `yarn --cwd openg7-org cert:localhost` again after installing mkcert.');
  console.log(`[https] Self-signed certificate written to ${certDir}`);
}

function removeExistingCertificate() {
  rmSync(certPath, { force: true });
  rmSync(keyPath, { force: true });
  rmSync(metaPath, { force: true });
}

function readProviderMetadata() {
  try {
    const parsed = JSON.parse(readFileSync(metaPath, 'utf8'));
    return parsed?.provider === 'mkcert' || parsed?.provider === 'selfsigned'
      ? parsed.provider
      : null;
  } catch {
    return null;
  }
}

function writeProviderMetadata(provider) {
  writeFileSync(
    metaPath,
    `${JSON.stringify({ provider, generatedAt: new Date().toISOString() }, null, 2)}\n`,
    'utf8'
  );
}

function resolveMkcertCommand() {
  const pathEntries = [
    'mkcert',
    resolve(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Links', 'mkcert.exe'),
    resolve(
      process.env.LOCALAPPDATA ?? '',
      'Microsoft',
      'WinGet',
      'Packages',
      'FiloSottile.mkcert_Microsoft.Winget.Source_8wekyb3d8bbwe',
      'mkcert.exe'
    ),
    resolve(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WindowsApps', 'mkcert.exe'),
  ];

  for (const entry of pathEntries) {
    if (!entry) {
      continue;
    }

    const result = spawnSync(entry, ['-help'], {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    if (!result.error) {
      return entry;
    }
  }

  return null;
}
