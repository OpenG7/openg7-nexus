#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function parseArguments(rawArguments) {
  const parsed = new Map();

  for (let index = 0; index < rawArguments.length; index += 1) {
    const token = rawArguments[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const nextValue = rawArguments[index + 1];
    const value = nextValue && !nextValue.startsWith('--') ? nextValue : 'true';
    if (value !== 'true') {
      index += 1;
    }

    const values = parsed.get(key) ?? [];
    values.push(value);
    parsed.set(key, values);
  }

  return parsed;
}

function firstArgument(parsed, key, fallback = null) {
  const values = parsed.get(key);
  return values?.[0] ?? fallback;
}

function listArguments(parsed, keys, fallback = '') {
  const values = keys.flatMap((key) => parsed.get(key) ?? []);
  const sourceValues = values.length ? values : [fallback];

  return sourceValues
    .flatMap((value) => value.split(/\r?\n|,/))
    .map((value) => value.trim())
    .filter(Boolean);
}

function loadJsonFile(filePath, fallback) {
  if (!filePath) {
    return fallback;
  }

  try {
    return JSON.parse(readFileSync(resolve(filePath), 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read JSON file ${filePath}: ${error.message}`);
  }
}

function uniqueSorted(values) {
  return Array.from(new Set(values.filter((value) => typeof value === 'string' && value.trim())))
    .map((value) => value.trim())
    .sort();
}

function inferGitHubArtifactUrl() {
  const serverUrl = process.env.GITHUB_SERVER_URL;
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;

  if (!serverUrl || !repository || !runId) {
    return null;
  }

  return `${serverUrl}/${repository}/actions/runs/${runId}#artifacts`;
}

function buildManifest(parsed) {
  const impact = loadJsonFile(firstArgument(parsed, 'impact'), { entryIds: [] });
  const explicitEntryIds = listArguments(
    parsed,
    ['entry-id', 'entryIds'],
    process.env.MATRIX_ENTRY_IDS ?? '',
  );
  const entryIds = uniqueSorted([
    ...(Array.isArray(impact.entryIds) ? impact.entryIds : []),
    ...explicitEntryIds,
  ]);
  const checks = listArguments(parsed, ['check', 'checks'], process.env.MATRIX_PROOF_CHECKS ?? '');
  const specs = listArguments(parsed, ['spec', 'specs'], process.env.MATRIX_PROOF_SPECS ?? '');
  const workflowRunId =
    firstArgument(parsed, 'workflow-run-id') ??
    process.env.GITHUB_RUN_ID ??
    process.env.GITHUB_RUN_NUMBER ??
    null;
  const workflow = firstArgument(parsed, 'workflow') ?? process.env.GITHUB_WORKFLOW ?? null;
  const artifactUrl =
    firstArgument(parsed, 'artifact-url') ??
    process.env.MATRIX_PROOF_ARTIFACT_URL ??
    inferGitHubArtifactUrl();

  return {
    commitSha: firstArgument(parsed, 'commit-sha') ?? process.env.GITHUB_SHA ?? null,
    workflowRunId,
    workflow,
    generatedAt: firstArgument(parsed, 'generated-at') ?? new Date().toISOString(),
    entryIds,
    checks: checks.length ? checks : [workflow ?? 'admin-quality-proof-manifest'],
    specs,
    artifactUrl,
    status: firstArgument(parsed, 'status', process.env.MATRIX_PROOF_STATUS ?? 'success'),
  };
}

const parsedArguments = parseArguments(process.argv.slice(2));
const outputPath = resolve(firstArgument(parsedArguments, 'output', 'matrix-proof-manifest.json'));
const manifest = buildManifest(parsedArguments);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(
  `Generated ${outputPath} for ${manifest.entryIds.length} admin-quality entr${manifest.entryIds.length === 1 ? 'y' : 'ies'}.`,
);
