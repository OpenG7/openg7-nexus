#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_PORTS = [1337, 4200];
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const noStart = args.has('--no-start');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..').toLowerCase();

function runCommand(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function parseWindowsPortOwners(output) {
  const owners = new Map();
  const lines = output.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('TCP') && !trimmed.startsWith('UDP')) {
      continue;
    }

    const parts = trimmed.split(/\s+/);
    const localAddress = parts[1] ?? '';
    const pidText = parts.at(-1) ?? '';
    const pid = Number.parseInt(pidText, 10);
    if (!Number.isInteger(pid) || pid <= 0) {
      continue;
    }

    const separatorIndex = localAddress.lastIndexOf(':');
    if (separatorIndex < 0) {
      continue;
    }

    const port = Number.parseInt(localAddress.slice(separatorIndex + 1), 10);
    if (!Number.isInteger(port)) {
      continue;
    }

    const bucket = owners.get(port) ?? new Set();
    bucket.add(pid);
    owners.set(port, bucket);
  }

  return owners;
}

function parseUnixPortOwners(output) {
  const owners = new Map();
  const lines = output.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const [pidText, portText] = trimmed.split(/\s+/);
    const pid = Number.parseInt(pidText, 10);
    const port = Number.parseInt(portText, 10);
    if (!Number.isInteger(pid) || !Number.isInteger(port)) {
      continue;
    }

    const bucket = owners.get(port) ?? new Set();
    bucket.add(pid);
    owners.set(port, bucket);
  }

  return owners;
}

function getPortOwners() {
  if (process.platform === 'win32') {
    const result = runCommand('netstat', ['-ano', '-p', 'tcp']);
    if (result.status !== 0) {
      throw new Error(result.stderr.trim() || 'Failed to inspect TCP listeners with netstat.');
    }
    return parseWindowsPortOwners(result.stdout);
  }

  const result = runCommand('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN', '-F', 'pn']);
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || 'Failed to inspect TCP listeners with lsof.');
  }

  const normalized = result.stdout
    .split(/\r?\n/)
    .reduce(
      (state, line) => {
        if (line.startsWith('p')) {
          state.currentPid = line.slice(1);
          return state;
        }
        if (line.startsWith('n')) {
          const raw = line.slice(1);
          const separatorIndex = raw.lastIndexOf(':');
          if (separatorIndex >= 0 && state.currentPid) {
            state.lines.push(`${state.currentPid} ${raw.slice(separatorIndex + 1)}`);
          }
        }
        return state;
      },
      { currentPid: '', lines: [] },
    );

  return parseUnixPortOwners(normalized.lines.join('\n'));
}

function killPid(pid) {
  if (process.platform === 'win32') {
    const result = runCommand('taskkill', ['/PID', String(pid), '/F']);
    if (result.status !== 0) {
      throw new Error(result.stderr.trim() || `Failed to stop PID ${pid}.`);
    }
    return;
  }

  const result = runCommand('kill', ['-9', String(pid)]);
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `Failed to stop PID ${pid}.`);
  }
}

function describePid(pid) {
  if (process.platform === 'win32') {
    const escapedPid = String(pid).replace(/'/g, "''");
    const result = runCommand('powershell', [
      '-NoProfile',
      '-Command',
      `Get-CimInstance Win32_Process -Filter \"ProcessId = ${escapedPid}\" | Select-Object -ExpandProperty CommandLine`,
    ]);
    return result.status === 0 ? result.stdout.trim() : '';
  }

  const result = runCommand('ps', ['-p', String(pid), '-o', 'command=']);
  return result.status === 0 ? result.stdout.trim() : '';
}

function processName(pid) {
  if (process.platform === 'win32') {
    const result = runCommand('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH']);
    if (result.status !== 0) {
      return '';
    }

    const line = result.stdout.split(/\r?\n/).find((entry) => entry.trim().startsWith('"'));
    if (!line) {
      return '';
    }

    const firstField = line.split('","')[0] ?? '';
    return firstField.replace(/^"/, '').trim().toLowerCase();
  }

  const result = runCommand('ps', ['-p', String(pid), '-o', 'comm=']);
  return result.status === 0 ? result.stdout.trim().toLowerCase() : '';
}

function isManagedDevProcess(port, commandLine, name) {
  const normalized = commandLine.toLowerCase().replace(/\s+/g, ' ');
  const normalizedName = name.toLowerCase();

  return (
    normalized.includes(rootDir) ||
    normalized.includes('strapi.js') ||
    normalized.includes('node_modules\\@strapi\\strapi') ||
    normalized.includes('ng.js') ||
    normalized.includes('ng serve') ||
    ((port === 1337 || port === 4200) && (normalizedName === 'node.exe' || normalizedName === 'node'))
  );
}

function formatPortOwners(portOwners) {
  return DEFAULT_PORTS.map((port) => {
    const owners = Array.from(portOwners.get(port) ?? []).sort((left, right) => left - right);
    return owners.length > 0 ? `${port}:${owners.join(',')}` : `${port}:free`;
  }).join(' ');
}

function startDevAllHttps() {
  const child = spawn('yarn', ['dev:all:https'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

function main() {
  const portOwners = getPortOwners();
  const candidates = DEFAULT_PORTS.flatMap((port) =>
    Array.from(portOwners.get(port) ?? []).map((pid) => ({
      port,
      pid,
      name: processName(pid),
      commandLine: describePid(pid),
    })),
  );
  const pidsToKill = new Set(candidates.map((candidate) => candidate.pid));

  if (pidsToKill.size === 0) {
    console.log(`[dev-all-clean] No listeners found on ${DEFAULT_PORTS.join(', ')}.`);
  } else if (dryRun) {
    console.log(
      `[dev-all-clean] [dry-run] Would stop: ${candidates
        .map((candidate) => `${candidate.port}:${candidate.pid}`)
        .join(' ')}`,
    );
  } else {
    console.log(
      `[dev-all-clean] Stopping listeners: ${candidates
        .map((candidate) => `${candidate.port}:${candidate.pid}`)
        .join(' ')}`,
    );
    for (const pid of pidsToKill) {
      killPid(pid);
    }
  }

  if (noStart) {
    console.log('[dev-all-clean] Skipping startup (--no-start).');
    return;
  }

  if (dryRun) {
    console.log('[dev-all-clean] [dry-run] Would run: yarn dev:all:https');
    return;
  }

  console.log('[dev-all-clean] Starting yarn dev:all:https');
  startDevAllHttps();
}

try {
  main();
} catch (error) {
  console.error('[dev-all-clean] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}