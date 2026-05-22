import { buildImpactMapFromMatrix, loadMatrixSnapshot } from './admin-quality-matrix-model.mjs';

const matrixSnapshot = loadMatrixSnapshot();

function loadKnownEntryIds() {
  const snapshot = matrixSnapshot;
  return Array.isArray(snapshot.entries)
    ? snapshot.entries
        .map((entry) => (typeof entry?.id === 'string' ? entry.id : null))
        .filter((entryId) => entryId)
    : [];
}

const ALL_ENTRY_IDS = loadKnownEntryIds();
const impactMap = buildImpactMapFromMatrix(matrixSnapshot);
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
  const impactMapping = {};
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
        rule.entryIds.forEach((entryId) => {
          matchedEntryIds.add(entryId);
          if (!impactMapping[entryId]) {
            impactMapping[entryId] = [];
          }
          if (!impactMapping[entryId].includes(file)) {
            impactMapping[entryId].push(file);
          }
        });
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
      impactMapping: requiresGlobalRefresh ? { '*': changedFiles } : {},
    };
  }

  return {
    entryIds: Array.from(matchedEntryIds).sort(),
    mode: 'targeted',
    reason:
      matchedEntryIds.size > 0
        ? 'Targeted impact map matched changed files.'
        : 'No matrix-impacting file detected.',
    impactMapping,
  };
}

const changedFiles = normalizeFiles(process.env.MATRIX_CHANGED_FILES ?? process.argv.slice(2));
const result = resolveImpact(changedFiles);

process.stdout.write(JSON.stringify({ changedFiles, ...result }));
