import { readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const impactMapPath = path.join(repoRoot, 'tools', 'admin-quality-matrix-impact-map.json');
const matrixSnapshotPath = path.join(
  repoRoot,
  'openg7-org',
  'src',
  'assets',
  'data',
  'admin-quality-matrix.json',
);

function loadKnownEntryIds() {
  const raw = readFileSync(matrixSnapshotPath, 'utf8');
  const snapshot = JSON.parse(raw);
  return Array.isArray(snapshot.entries)
    ? snapshot.entries
        .map((entry) => (typeof entry?.id === 'string' ? entry.id : null))
        .filter((entryId) => entryId)
    : [];
}

const ALL_ENTRY_IDS = loadKnownEntryIds();
const impactMap = JSON.parse(readFileSync(impactMapPath, 'utf8'));
const IMPACT_RULES = Array.isArray(impactMap.rules) ? impactMap.rules : [];
const GLOBAL_PREFIXES = Array.isArray(impactMap.globalPrefixes) ? impactMap.globalPrefixes : [];

function normalizeFiles(rawValue) {
  const files =
    typeof rawValue === 'string'
      ? rawValue.split(/\r?\n/)
      : Array.isArray(rawValue)
        ? rawValue
        : [];
  return files.map((file) => file.trim()).filter(Boolean);
}

function matchesPrefix(file, prefixes) {
  return prefixes.some((prefix) => file === prefix || file.startsWith(prefix));
}

function resolveImpact(changedFiles) {
  const matchedEntryIds = new Set();
  let requiresGlobalRefresh = false;
  let touchedProductCode = false;

  for (const file of changedFiles) {
    if (matchesPrefix(file, GLOBAL_PREFIXES)) {
      requiresGlobalRefresh = true;
    }
    if (file.startsWith('openg7-org/src/') || file.startsWith('strapi/src/')) {
      touchedProductCode = true;
    }

    for (const rule of IMPACT_RULES) {
      if (matchesPrefix(file, rule.prefixes)) {
        rule.entryIds.forEach((entryId) => matchedEntryIds.add(entryId));
      }
    }
  }

  if (requiresGlobalRefresh || (touchedProductCode && matchedEntryIds.size === 0)) {
    return {
      entryIds: ALL_ENTRY_IDS,
      mode: 'global',
      reason: requiresGlobalRefresh
        ? 'Global matrix infrastructure changed.'
        : 'Product code changed without a specific impact mapping.',
    };
  }

  return {
    entryIds: Array.from(matchedEntryIds).sort(),
    mode: 'targeted',
    reason:
      matchedEntryIds.size > 0
        ? 'Targeted impact map matched changed files.'
        : 'No matrix-impacting file detected.',
  };
}

const changedFiles = normalizeFiles(process.env.MATRIX_CHANGED_FILES ?? process.argv.slice(2));
const result = resolveImpact(changedFiles);

process.stdout.write(JSON.stringify({ changedFiles, ...result }));
