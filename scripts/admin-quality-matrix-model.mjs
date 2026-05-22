import { readFileSync } from 'node:fs';
import path from 'node:path';

export const repoRoot = path.resolve(import.meta.dirname, '..');
export const matrixSnapshotPath = path.join(
  repoRoot,
  'openg7-org',
  'src',
  'assets',
  'data',
  'admin-quality-matrix.json',
);
export const impactMapPath = path.join(repoRoot, 'tools', 'admin-quality-matrix-impact-map.json');

export function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function loadMatrixSnapshot() {
  return loadJson(matrixSnapshotPath);
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
    left.localeCompare(right),
  );
}

export function normalizeMatrixEntries(snapshot) {
  return Array.isArray(snapshot?.entries)
    ? snapshot.entries
        .map((entry) => normalizeObject(entry))
        .filter((entry) => typeof entry.id === 'string' && entry.id.trim())
    : [];
}

export function normalizePathPrefixRule(value) {
  const record = normalizeObject(value);
  const prefixes = normalizeStringArray(record.prefixes);
  if (!prefixes.length) {
    return null;
  }

  return {
    type:
      typeof record.type === 'string' && record.type.trim() ? record.type.trim() : 'path-prefix',
    prefixes: uniqueSorted(prefixes),
  };
}

export function normalizePathPrefixRules(value) {
  if (Array.isArray(value)) {
    return value.map((rule) => normalizePathPrefixRule(rule)).filter((rule) => rule !== null);
  }

  const singleRule = normalizePathPrefixRule(value);
  return singleRule ? [singleRule] : [];
}

export function buildImpactMapFromMatrix(snapshot) {
  const entries = normalizeMatrixEntries(snapshot);
  const rules = entries.flatMap((entry) =>
    normalizePathPrefixRules(entry.impactRules).map((rule) => ({
      entryIds: [entry.id],
      prefixes: rule.prefixes,
    })),
  );
  const globalPrefixes = normalizePathPrefixRules(snapshot?.globalImpactRules).flatMap(
    (rule) => rule.prefixes,
  );

  return {
    generatedFrom: 'openg7-org/src/assets/data/admin-quality-matrix.json',
    rules,
    globalPrefixes: uniqueSorted(globalPrefixes),
  };
}

export function loadImpactMapFromMatrixOrFallback() {
  const snapshot = loadMatrixSnapshot();
  const impactMap = buildImpactMapFromMatrix(snapshot);
  if (impactMap.rules.length || impactMap.globalPrefixes.length) {
    return impactMap;
  }

  return loadJson(impactMapPath);
}
