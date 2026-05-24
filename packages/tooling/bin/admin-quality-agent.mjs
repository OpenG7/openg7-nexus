#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildImpactMapFromMatrix,
  loadMatrixSnapshot,
} from '../../../scripts/admin-quality-matrix-model.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..', '..');
const defaultReportPath = 'admin-quality-agent-report.json';
const defaultMarkdownReportPath = 'admin-quality-agent-report.md';
const defaultProofManifestPath = 'matrix-proof-manifest.json';

const actionCatalog = [
  {
    id: 'sync-checklist',
    title: 'Sync product checklist',
    mutates: true,
    heavy: false,
    reason: 'Keep the product checklist snapshot aligned before proof generation.',
    commands: ['yarn sync:checklist', 'yarn checklist:verify'],
    checks: ['yarn checklist:verify'],
  },
  {
    id: 'generate-quality-actions',
    title: 'Refresh admin-quality action discovery',
    mutates: true,
    heavy: false,
    reason: 'Refresh discovered data-og7 action coverage used by the admin-quality UI.',
    commands: ['yarn generate:quality-actions', 'yarn validate:quality-actions'],
    checks: ['yarn validate:quality-actions'],
  },
  {
    id: 'generate-sitemap',
    title: 'Refresh sitemap',
    mutates: true,
    heavy: false,
    reason: 'Regenerate sitemap artifacts before validating the public web surface.',
    commands: ['yarn generate:sitemap', 'yarn workspace @openg7/web validate:sitemap'],
    checks: ['yarn workspace @openg7/web validate:sitemap'],
  },
  {
    id: 'codegen-contracts',
    title: 'Regenerate contracts',
    mutates: true,
    heavy: false,
    reason: 'Regenerate shared OpenAPI TypeScript contracts when API surfaces may have changed.',
    commands: ['yarn codegen', 'yarn test'],
    checks: ['yarn codegen', 'yarn test'],
  },
  {
    id: 'validate-selectors',
    title: 'Validate data-og7 selectors',
    mutates: false,
    heavy: false,
    reason: 'Ensure AGENTS.md selectors still exist in front-end code.',
    commands: ['yarn validate:selectors'],
    checks: ['yarn validate:selectors'],
  },
  {
    id: 'validate-quality-actions',
    title: 'Validate action discovery',
    mutates: false,
    heavy: false,
    reason: 'Ensure generated admin-quality action discovery is current.',
    commands: ['yarn validate:quality-actions'],
    checks: ['yarn validate:quality-actions'],
  },
  {
    id: 'validate-sitemap',
    title: 'Validate sitemap',
    mutates: false,
    heavy: false,
    reason: 'Ensure public sitemap output matches the generator.',
    commands: ['yarn workspace @openg7/web validate:sitemap'],
    checks: ['yarn workspace @openg7/web validate:sitemap'],
  },
  {
    id: 'checklist-verify',
    title: 'Verify product checklist',
    mutates: false,
    heavy: false,
    reason: 'Ensure the product checklist is synchronized with the current repository state.',
    commands: ['yarn checklist:verify'],
    checks: ['yarn checklist:verify'],
  },
  {
    id: 'admin-quality-integration',
    title: 'Validate admin-quality matrix API',
    mutates: false,
    heavy: false,
    reason: 'Verify Strapi ingest, proof manifest, and recalculation flows.',
    commands: ['yarn --cwd strapi test:integration:admin-quality-matrix'],
    checks: ['yarn --cwd strapi test:integration:admin-quality-matrix'],
    specs: ['strapi/scripts/test-admin-quality-matrix-api-integration.js'],
  },
  {
    id: 'lint',
    title: 'Run lint',
    mutates: false,
    heavy: false,
    reason: 'Catch repository-wide static analysis failures before proof publication.',
    commands: ['yarn lint'],
    checks: ['yarn lint'],
  },
  {
    id: 'prebuild-web',
    title: 'Run web prebuild checks',
    mutates: true,
    heavy: true,
    reason: 'Run contracts codegen and contract tests used before the web build.',
    commands: ['yarn prebuild:web'],
    checks: ['yarn prebuild:web'],
  },
  {
    id: 'build-web',
    title: 'Build web',
    mutates: true,
    heavy: true,
    reason: 'Execute the Angular production build when the operator asks for a full loop.',
    commands: ['yarn build:web'],
    checks: ['yarn build:web'],
  },
];

const actionById = new Map(actionCatalog.map((action) => [action.id, action]));

function parseArguments(rawArguments) {
  const parsed = new Map();
  const positional = [];

  for (let index = 0; index < rawArguments.length; index += 1) {
    const token = rawArguments[index];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split(/=(.*)/s, 2);
    const nextValue = rawArguments[index + 1];
    const value =
      inlineValue !== undefined
        ? inlineValue
        : nextValue && !nextValue.startsWith('--')
          ? nextValue
          : 'true';
    if (inlineValue === undefined && value !== 'true') {
      index += 1;
    }

    const values = parsed.get(rawKey) ?? [];
    values.push(value);
    parsed.set(rawKey, values);
  }

  return { parsed, positional };
}

function firstArgument(parsed, key, fallback = null) {
  return parsed.get(key)?.[0] ?? fallback;
}

function listArguments(parsed, keys, fallback = '') {
  const values = keys.flatMap((key) => parsed.get(key) ?? []);
  const sourceValues = values.length ? values : [fallback];

  return sourceValues
    .flatMap((value) => String(value).split(/\r?\n|,/))
    .map((value) => value.trim())
    .filter(Boolean);
}

function hasFlag(parsed, key) {
  return parsed.has(key) && firstArgument(parsed, key) !== 'false';
}

function integerArgument(parsed, key, fallback) {
  const value = Number.parseInt(firstArgument(parsed, key, String(fallback)), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
    left.localeCompare(right),
  );
}

function normalizePath(value) {
  return value.trim().replace(/\\/g, '/');
}

function readChangedFilesFromArgument(parsed) {
  const explicit = listArguments(parsed, ['changed-file', 'changedFiles', 'changed-files']);
  const filePath = firstArgument(parsed, 'changed-files-file');
  const fromFile = filePath
    ? readFileSync(resolve(repoRoot, filePath), 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  return uniqueSorted([...explicit, ...fromFile].map(normalizePath));
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
  });

  if (result.status !== 0) {
    return '';
  }

  return result.stdout.trimEnd();
}

function readWorkingTreeChangedFiles() {
  const diffFiles = runGit(['diff', '--name-only', 'HEAD'])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const statusFiles = runGit(['status', '--short'])
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.slice(3))
    .map((file) => (file.includes(' -> ') ? file.split(' -> ').at(-1) : file))
    .filter(Boolean);

  return uniqueSorted([...diffFiles, ...statusFiles].map(normalizePath));
}

function currentCommitSha() {
  return runGit(['rev-parse', 'HEAD']) || process.env.GITHUB_SHA || null;
}

function currentBranch() {
  return runGit(['branch', '--show-current']) || process.env.GITHUB_REF_NAME || null;
}

function loadMatrixEntries() {
  const snapshot = loadMatrixSnapshot();
  return Array.isArray(snapshot.entries) ? snapshot.entries : [];
}

function loadImpactMap() {
  return buildImpactMapFromMatrix(loadMatrixSnapshot());
}

function matchesPrefix(file, prefixes) {
  return prefixes.some((prefix) => file === prefix || file.startsWith(prefix));
}

function resolveImpact(changedFiles, entries, impactMap) {
  const allEntryIds = entries.map((entry) => entry.id).filter(Boolean);
  const rules = Array.isArray(impactMap.rules) ? impactMap.rules : [];
  const globalPrefixes = Array.isArray(impactMap.globalPrefixes) ? impactMap.globalPrefixes : [];
  const matchedEntryIds = new Set();
  let requiresGlobalRefresh = false;
  let touchedProductCode = false;

  for (const file of changedFiles) {
    if (matchesPrefix(file, globalPrefixes)) {
      requiresGlobalRefresh = true;
    }
    if (file.startsWith('openg7-org/src/') || file.startsWith('strapi/src/')) {
      touchedProductCode = true;
    }

    for (const rule of rules) {
      if (matchesPrefix(file, Array.isArray(rule.prefixes) ? rule.prefixes : [])) {
        for (const entryId of Array.isArray(rule.entryIds) ? rule.entryIds : []) {
          matchedEntryIds.add(entryId);
        }
      }
    }
  }

  if (!changedFiles.length) {
    return {
      entryIds: [],
      mode: 'none',
      reason: 'No changed files were provided or detected.',
    };
  }

  if (requiresGlobalRefresh || (touchedProductCode && matchedEntryIds.size === 0)) {
    return {
      entryIds: allEntryIds,
      mode: 'global',
      reason: requiresGlobalRefresh
        ? 'Global matrix infrastructure changed.'
        : 'Product code changed without a specific impact mapping.',
    };
  }

  return {
    entryIds: Array.from(matchedEntryIds).sort(),
    mode: matchedEntryIds.size > 0 ? 'targeted' : 'none',
    reason:
      matchedEntryIds.size > 0
        ? 'Targeted impact map matched changed files.'
        : 'No matrix-impacting file detected.',
  };
}

function isGreenEntry(entry) {
  return (
    entry.managementBucket === 'covered' &&
    entry.summaryStatus === 'oui' &&
    entry.businessStatus === 'oui' &&
    entry.implementationStatus === 'oui' &&
    entry.e2eStatus === 'oui'
  );
}

function isAutoActionableEntry(entry) {
  return !entry.needsProductWorkFirst && entry.managementBucket !== 'scope-limit';
}

function buildEntryPlan(entry) {
  const mode = entry.managementBucket === 'covered' ? 'hardening' : entry.managementBucket;
  const commands = [];
  const e2eSpecs = Array.isArray(entry.evidence)
    ? entry.evidence.filter((item) => item.startsWith('e2e/') && item.endsWith('.spec.ts'))
    : [];
  const unitSpecs = Array.isArray(entry.evidence)
    ? entry.evidence.filter((item) => item.startsWith('src/') && item.endsWith('.spec.ts'))
    : [];

  if (e2eSpecs.length) {
    commands.push(
      `yarn --cwd openg7-org exec playwright test ${e2eSpecs.join(' ')} --workers=1 --reporter=dot`,
    );
  }
  if (unitSpecs.length) {
    commands.push(
      `yarn --cwd openg7-org test --watch=false --browsers=ChromeHeadlessNoSandbox ${unitSpecs
        .map((item) => `--include ${item}`)
        .join(' ')}`,
    );
  }

  return {
    entryId: entry.id,
    domain: entry.domain,
    priority: entry.priority,
    managementBucket: entry.managementBucket,
    autoActionable: isAutoActionableEntry(entry),
    green: isGreenEntry(entry),
    mode,
    nextMove: entry.nextMove,
    observedGap: entry.observedGap,
    suggestedCommands: commands,
    blockingReason: isAutoActionableEntry(entry)
      ? null
      : 'Product scope or product surface work is required before an automated proof loop can close this entry.',
  };
}

function shouldRunCodegen(changedFiles, selectedEntryIds) {
  if (selectedEntryIds.length === 0) {
    return false;
  }
  return changedFiles.some(
    (file) =>
      file.startsWith('packages/contracts/') ||
      file.startsWith('strapi/src/api/') ||
      file === 'AGENTS.md',
  );
}

function chooseActions(options, changedFiles, selectedEntryIds) {
  if (options.actionIds.length) {
    return options.actionIds.map((id) => actionById.get(id)).filter(Boolean);
  }

  const planned = [];
  if (options.apply) {
    planned.push(actionById.get('sync-checklist'));
    planned.push(actionById.get('generate-quality-actions'));
    planned.push(actionById.get('generate-sitemap'));
    if (shouldRunCodegen(changedFiles, selectedEntryIds) || options.full) {
      planned.push(actionById.get('codegen-contracts'));
    }
  }

  planned.push(actionById.get('checklist-verify'));
  planned.push(actionById.get('validate-quality-actions'));
  planned.push(actionById.get('validate-selectors'));
  planned.push(actionById.get('validate-sitemap'));
  planned.push(actionById.get('admin-quality-integration'));
  planned.push(actionById.get('lint'));

  if (options.full) {
    planned.push(actionById.get('prebuild-web'));
    planned.push(actionById.get('build-web'));
  } else if (options.includeHeavy) {
    planned.push(actionById.get('prebuild-web'));
  }

  return planned.filter(Boolean);
}

function tail(value, maxLength = 6000) {
  if (value.length <= maxLength) {
    return value;
  }
  return value.slice(value.length - maxLength);
}

function runCommand(command) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let stdout = '';
  let stderr = '';

  return new Promise((resolveCommand) => {
    const child = spawn(command, {
      cwd: repoRoot,
      env: process.env,
      shell: true,
      windowsHide: true,
    });

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });
    child.on('close', (exitCode) => {
      const finishedAt = new Date().toISOString();
      resolveCommand({
        command,
        status: exitCode === 0 ? 'success' : 'failure',
        exitCode,
        startedAt,
        finishedAt,
        durationMs: Date.now() - started,
        stdoutTail: tail(stdout),
        stderrTail: tail(stderr),
      });
    });
    child.on('error', (error) => {
      const finishedAt = new Date().toISOString();
      resolveCommand({
        command,
        status: 'failure',
        exitCode: 1,
        startedAt,
        finishedAt,
        durationMs: Date.now() - started,
        stdoutTail: tail(stdout),
        stderrTail: tail(`${stderr}\n${error.message}`),
      });
    });
  });
}

async function runAction(action, options) {
  const startedAt = new Date().toISOString();
  const commandResults = [];

  if (action.heavy && !options.includeHeavy && !options.full) {
    return {
      id: action.id,
      title: action.title,
      status: 'skipped',
      reason: 'Heavy action skipped. Use --include-heavy or --full to run it.',
      startedAt,
      finishedAt: new Date().toISOString(),
      commands: [],
    };
  }

  if (!options.apply) {
    return {
      id: action.id,
      title: action.title,
      status: 'planned',
      reason: action.reason,
      startedAt,
      finishedAt: new Date().toISOString(),
      commands: action.commands.map((command) => ({ command, status: 'planned' })),
    };
  }

  for (const command of action.commands) {
    const result = await runCommand(command);
    commandResults.push(result);
    if (result.status === 'failure') {
      return {
        id: action.id,
        title: action.title,
        status: 'failure',
        reason: action.reason,
        startedAt,
        finishedAt: new Date().toISOString(),
        commands: commandResults,
      };
    }
  }

  return {
    id: action.id,
    title: action.title,
    status: 'success',
    reason: action.reason,
    startedAt,
    finishedAt: new Date().toISOString(),
    commands: commandResults,
  };
}

function buildProofManifest({ options, entryIds, actionResults, status, changedFiles }) {
  const executedActions = actionResults.filter((action) =>
    ['success', 'planned'].includes(action.status),
  );
  const checks = uniqueSorted(
    executedActions.flatMap((result) => actionById.get(result.id)?.checks ?? []),
  );
  const specs = uniqueSorted(
    executedActions.flatMap((result) => actionById.get(result.id)?.specs ?? []),
  );

  return {
    commitSha: currentCommitSha(),
    workflowRunId: process.env.GITHUB_RUN_ID ?? null,
    workflow: process.env.GITHUB_WORKFLOW ?? 'admin-quality-agent',
    generatedAt: new Date().toISOString(),
    entryIds: uniqueSorted(entryIds),
    checks: checks.length ? checks : ['admin-quality-agent dry-run'],
    specs,
    artifactUrl: firstArgument(options.parsed, 'artifact-url') ?? null,
    status,
    changedFiles,
  };
}

function writeJson(filePath, value) {
  const absolutePath = resolve(repoRoot, filePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function renderMarkdownReport(report) {
  const lines = [
    '# Admin Quality Agent Report',
    '',
    `- Status: ${report.status}`,
    `- Mode: ${report.apply ? 'apply' : 'dry-run'}`,
    `- Generated at: ${report.generatedAt}`,
    `- Branch: ${report.branch ?? 'unknown'}`,
    `- Commit: ${report.commitSha ?? 'unknown'}`,
    `- Impact: ${report.impact.mode} (${report.impact.reason})`,
    `- Selected entries: ${report.selectedEntryIds.length ? report.selectedEntryIds.join(', ') : 'none'}`,
    '',
    '## Actions',
    '',
  ];

  for (const action of report.actions) {
    lines.push(`- ${action.id}: ${action.status}`);
  }

  lines.push('', '## Entries', '');
  for (const entry of report.entries) {
    lines.push(
      `- ${entry.entryId}: ${entry.green ? 'green' : 'needs-work'} / ${entry.autoActionable ? 'auto-actionable' : 'blocked'} - ${entry.domain}`,
    );
  }

  if (report.ingest.status !== 'not-requested') {
    lines.push('', '## Ingest', '', `- Status: ${report.ingest.status}`);
    if (report.ingest.message) {
      lines.push(`- Message: ${report.ingest.message}`);
    }
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function ingestProofManifest(options, payload) {
  if (!options.ingest) {
    return { status: 'not-requested', message: null };
  }

  const ingestUrl =
    firstArgument(options.parsed, 'ingest-url') ??
    process.env.ADMIN_QUALITY_MATRIX_INGEST_URL ??
    process.env.ADMIN_QUALITY_INGEST_URL ??
    null;
  const ingestToken =
    firstArgument(options.parsed, 'ingest-token') ??
    process.env.ADMIN_QUALITY_MATRIX_INGEST_TOKEN ??
    process.env.STRAPI_ADMIN_QUALITY_INGEST_TOKEN ??
    null;

  if (!ingestUrl || !ingestToken) {
    const message = 'Ingest requested but ingest URL or token is missing.';
    if (options.requireIngest) {
      throw new Error(message);
    }
    return { status: 'skipped', message };
  }

  const response = await fetch(ingestUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ingestToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Ingest failed with HTTP ${response.status}: ${body}`);
  }

  return { status: 'success', message: body ? tail(body, 2000) : null };
}

function buildIngestPayload(report, proofManifest) {
  return {
    mergedAt: report.generatedAt,
    commitSha: report.commitSha ?? 'local-admin-quality-agent',
    source: 'admin-quality-agent',
    workflow: process.env.GITHUB_WORKFLOW ?? null,
    branch: report.branch,
    summary: `admin-quality-agent ${report.status} (${report.actions.length} action(s), impact=${report.impact.mode})`,
    changedFiles: report.changedFiles,
    impactedEntryIds: report.selectedEntryIds,
    proofManifest,
  };
}

function printHelp() {
  process.stdout.write(`Admin Quality Agent\n\n`);
  process.stdout.write(`Usage:\n`);
  process.stdout.write(
    `  yarn admin:quality:agent [--apply] [--full] [--entry-id ID] [--action ID]\n\n`,
  );
  process.stdout.write(`Options:\n`);
  process.stdout.write(
    `  --apply                  Execute allowlisted actions. Default is dry-run.\n`,
  );
  process.stdout.write(`  --full                   Include heavy prebuild/build actions.\n`);
  process.stdout.write(`  --include-heavy          Include prebuild without full build.\n`);
  process.stdout.write(`  --max-actions N          Limit planned actions. Default: 8.\n`);
  process.stdout.write(
    `  --entry-id ID            Target one matrix entry. Repeat or comma-separate.\n`,
  );
  process.stdout.write(
    `  --changed-file PATH      Add changed file input for impact resolution.\n`,
  );
  process.stdout.write(
    `  --changed-files-file P   Read changed files from a newline-separated file.\n`,
  );
  process.stdout.write(`  --action ID              Run only selected allowlisted action(s).\n`);
  process.stdout.write(
    `  --ingest                 POST proof manifest to Strapi ingest endpoint.\n`,
  );
  process.stdout.write(`  --strict                 Exit non-zero if blocked entries remain.\n`);
  process.stdout.write(
    `  --report PATH            JSON report path. Default: ${defaultReportPath}.\n`,
  );
  process.stdout.write(
    `  --markdown-report PATH   Markdown report path. Default: ${defaultMarkdownReportPath}.\n`,
  );
  process.stdout.write(
    `  --proof-output PATH      Proof manifest path. Default: ${defaultProofManifestPath}.\n`,
  );
}

async function main() {
  const { parsed } = parseArguments(process.argv.slice(2));
  if (hasFlag(parsed, 'help')) {
    printHelp();
    return;
  }

  const options = {
    parsed,
    apply: hasFlag(parsed, 'apply'),
    full: hasFlag(parsed, 'full'),
    includeHeavy: hasFlag(parsed, 'include-heavy'),
    ingest: hasFlag(parsed, 'ingest'),
    requireIngest: hasFlag(parsed, 'require-ingest'),
    strict: hasFlag(parsed, 'strict'),
    maxActions: integerArgument(parsed, 'max-actions', 8),
    actionIds: listArguments(parsed, ['action', 'actions']),
    entryIds: listArguments(parsed, ['entry-id', 'entryIds']),
    reportPath: firstArgument(parsed, 'report', defaultReportPath),
    markdownReportPath: firstArgument(parsed, 'markdown-report', defaultMarkdownReportPath),
    proofOutputPath: firstArgument(parsed, 'proof-output', defaultProofManifestPath),
  };

  for (const actionId of options.actionIds) {
    if (!actionById.has(actionId)) {
      throw new Error(`Unknown admin-quality agent action: ${actionId}`);
    }
  }

  const matrixEntries = loadMatrixEntries();
  const impactMap = loadImpactMap();
  const explicitChangedFiles = readChangedFilesFromArgument(parsed);
  const workingTreeChangedFiles = readWorkingTreeChangedFiles();
  const changedFiles = explicitChangedFiles.length ? explicitChangedFiles : workingTreeChangedFiles;
  const impact = resolveImpact(changedFiles, matrixEntries, impactMap);
  const nonGreenEntries = matrixEntries.filter((entry) => !isGreenEntry(entry));
  const selectedEntryIds = uniqueSorted(
    options.entryIds.length
      ? options.entryIds
      : impact.entryIds.length
        ? impact.entryIds
        : nonGreenEntries.map((entry) => entry.id),
  );
  const selectedEntries = matrixEntries.filter((entry) => selectedEntryIds.includes(entry.id));
  const entryPlans = selectedEntries.map(buildEntryPlan);
  const actions = chooseActions(options, changedFiles, selectedEntryIds).slice(
    0,
    options.maxActions,
  );
  const actionResults = [];
  let status = options.apply ? 'success' : 'planned';

  for (const action of actions) {
    const result = await runAction(action, options);
    actionResults.push(result);
    if (result.status === 'failure') {
      status = 'failure';
      break;
    }
  }

  const blockedEntries = entryPlans.filter((entry) => !entry.green && !entry.autoActionable);
  if (status !== 'failure' && blockedEntries.length) {
    status = options.apply ? 'blocked' : 'planned';
  }

  const finalChangedFiles = readWorkingTreeChangedFiles();
  const generatedAt = new Date().toISOString();
  const proofManifest = buildProofManifest({
    options,
    entryIds: selectedEntryIds,
    actionResults,
    status,
    changedFiles: finalChangedFiles.length ? finalChangedFiles : changedFiles,
  });
  const report = {
    generatedAt,
    status,
    apply: options.apply,
    branch: currentBranch(),
    commitSha: currentCommitSha(),
    changedFiles,
    finalChangedFiles,
    impact,
    selectedEntryIds,
    entries: entryPlans,
    actions: actionResults,
    truncatedActionCount: Math.max(
      0,
      chooseActions(options, changedFiles, selectedEntryIds).length - actions.length,
    ),
    proofManifestPath: options.proofOutputPath,
    ingest: { status: 'not-requested', message: null },
  };

  writeJson(options.proofOutputPath, proofManifest);

  if (options.ingest) {
    report.ingest = await ingestProofManifest(options, buildIngestPayload(report, proofManifest));
  }

  writeJson(options.reportPath, report);
  writeFileSync(
    resolve(repoRoot, options.markdownReportPath),
    renderMarkdownReport(report),
    'utf8',
  );

  process.stdout.write(
    `admin-quality-agent ${status}: ${actionResults.length} action(s), ${selectedEntryIds.length} entr${
      selectedEntryIds.length === 1 ? 'y' : 'ies'
    }.\n`,
  );
  process.stdout.write(`Report: ${options.reportPath}\n`);
  process.stdout.write(`Proof manifest: ${options.proofOutputPath}\n`);

  if (status === 'failure' || (options.strict && status === 'blocked')) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(
    `admin-quality-agent failed: ${error instanceof Error ? error.message : error}\n`,
  );
  process.exitCode = 1;
});
