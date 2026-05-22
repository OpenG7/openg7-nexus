import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  buildImpactMapFromMatrix,
  loadMatrixSnapshot,
  normalizeMatrixEntries,
  normalizePathPrefixRules,
  normalizeStringArray,
  repoRoot,
  uniqueSorted,
} from './admin-quality-matrix-model.mjs';

const DEFAULT_OUTPUT = 'admin-quality-needs-discovery.json';
const IGNORED_DIRECTORIES = new Set([
  '.angular',
  '.git',
  '.next',
  '.turbo',
  '.yarn',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'tmp',
]);
const STOP_WORDS = new Set([
  'avec',
  'dans',
  'des',
  'les',
  'pour',
  'sur',
  'une',
  'aux',
  'and',
  'the',
  'from',
  'with',
  'this',
  'that',
  'admin',
  'quality',
  'matrix',
]);

function parseArguments(rawArguments) {
  const parsed = new Map();
  for (let index = 0; index < rawArguments.length; index += 1) {
    const token = rawArguments[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const [key, inlineValue] = token.slice(2).split(/=(.*)/s, 2);
    const next = rawArguments[index + 1];
    const value = inlineValue ?? (next && !next.startsWith('--') ? next : 'true');
    if (inlineValue === undefined && value !== 'true') {
      index += 1;
    }
    parsed.set(key, value);
  }
  return parsed;
}

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function relativePath(filePath) {
  return normalizePath(path.relative(repoRoot, filePath));
}

function readText(filePath) {
  try {
    return readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  } catch {
    return '';
  }
}

function walkFiles(rootPath, extensions) {
  const absoluteRoot = path.join(repoRoot, rootPath);
  if (!existsSync(absoluteRoot)) {
    return [];
  }

  const files = [];
  const stack = [absoluteRoot];
  while (stack.length) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    for (const item of readdirSync(current)) {
      const absolute = path.join(current, item);
      const stat = statSync(absolute);
      if (stat.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(item)) {
          stack.push(absolute);
        }
        continue;
      }

      if (extensions.some((extension) => absolute.endsWith(extension))) {
        files.push(absolute);
      }
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function firstMarkdownTitle(text) {
  const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return title || null;
}

function extractRoutePaths(text) {
  return Array.from(text.matchAll(/\bpath\s*:\s*['"`]([^'"`]+)['"`]/g))
    .map((match) => match[1])
    .filter(Boolean);
}

function extractSelectors(text) {
  return uniqueSorted(
    Array.from(
      text.matchAll(/\bselector\s*:\s*['"`]([^'"`]+)['"`]|data-og7(?:-id)?=["'`]([^"'`]+)["'`]/g),
    )
      .map((match) => match[1] ?? match[2])
      .filter(Boolean),
  );
}

function flattenJson(value, prefix = '') {
  if (typeof value === 'string') {
    return [{ key: prefix, value }];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenJson(item, `${prefix}.${index}`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      flattenJson(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [];
}

function tokenize(value) {
  return uniqueSorted(
    String(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length >= 4 && !STOP_WORDS.has(token)),
  );
}

function tokensForEntry(entry) {
  return tokenize([entry.id, entry.domain, entry.need].join(' '));
}

function sourceRefKey(ref) {
  return [ref.type, ref.path ?? '', ref.value ?? '', ref.key ?? ''].join('::');
}

function declaredSourceRefKeys(entry) {
  const refs = Array.isArray(entry.sourceRefs) ? entry.sourceRefs : [];
  return new Set(refs.map((ref) => sourceRefKey(ref)));
}

function evidencePathsFor(entry) {
  return normalizeStringArray(entry.evidence).map((item) =>
    item.startsWith('e2e/') || item.startsWith('src/') ? `openg7-org/${item}` : item,
  );
}

function impactPrefixesFor(entry) {
  return normalizePathPrefixRules(entry.impactRules).flatMap((rule) => rule.prefixes);
}

function pathMatchesPrefix(filePath, prefixes) {
  return prefixes.find((prefix) => filePath === prefix || filePath.startsWith(prefix)) ?? null;
}

function buildSources() {
  const docFiles = walkFiles('docs', ['.md']).map((filePath) => {
    const text = readText(filePath);
    return {
      type: 'doc',
      path: relativePath(filePath),
      label: firstMarkdownTitle(text),
      text,
    };
  });

  const e2eFiles = walkFiles('openg7-org/e2e', ['.ts', '.md']).map((filePath) => {
    const text = readText(filePath);
    return {
      type: filePath.endsWith('.spec.ts') ? 'e2e' : 'doc',
      path: relativePath(filePath),
      label: text.match(/\btest(?:\.describe)?\s*\(\s*['"`]([^'"`]+)['"`]/)?.[1] ?? null,
      text,
    };
  });

  const appFiles = walkFiles('openg7-org/src/app', ['.ts', '.html']).map((filePath) => {
    const text = readText(filePath);
    const routePaths = extractRoutePaths(text);
    const selectors = extractSelectors(text);
    return {
      type: routePaths.length ? 'route' : selectors.length ? 'selector' : 'source',
      path: relativePath(filePath),
      value: uniqueSorted([...routePaths, ...selectors]).join(', ') || null,
      text: [text.slice(0, 8000), routePaths.join(' '), selectors.join(' ')].join(' '),
    };
  });

  const apiRoot = path.join(repoRoot, 'strapi', 'src', 'api');
  const apiSources = existsSync(apiRoot)
    ? readdirSync(apiRoot)
        .filter((item) => {
          try {
            return statSync(path.join(apiRoot, item)).isDirectory();
          } catch {
            return false;
          }
        })
        .sort((left, right) => left.localeCompare(right))
        .map((apiName) => ({
          type: 'strapi-api',
          path: normalizePath(path.join('strapi/src/api', apiName, '/')),
          value: apiName,
          text: apiName.replace(/-/g, ' '),
        }))
    : [];

  const i18nPath = path.join(repoRoot, 'openg7-org', 'src', 'assets', 'i18n', 'fr.json');
  const i18nSources = existsSync(i18nPath)
    ? flattenJson(JSON.parse(readText(i18nPath)))
        .filter((entry) =>
          /\b(besoin|parcours|opportunit|alerte|import|carte|profil|permission|trust|signal)\b/i.test(
            entry.value,
          ),
        )
        .slice(0, 200)
        .map((entry) => ({
          type: 'i18n',
          path: 'openg7-org/src/assets/i18n/fr.json',
          key: entry.key,
          value: entry.value.slice(0, 180),
          text: `${entry.key} ${entry.value}`,
        }))
    : [];

  return [...docFiles, ...e2eFiles, ...appFiles, ...apiSources, ...i18nSources];
}

function sourceRefFromSource(source) {
  return {
    type: source.type,
    path: source.path,
    value: source.value ?? null,
    key: source.key ?? null,
    label: source.label ?? null,
  };
}

function matchSourceToEntry(source, entry, tokens) {
  const evidencePaths = evidencePathsFor(entry);
  if (evidencePaths.includes(source.path)) {
    return { matched: true, reason: 'declared-evidence', score: 100 };
  }

  const sourceTokens = tokenize(
    [source.path, source.value, source.key, source.label, source.text].join(' '),
  );
  const overlap = tokens.filter((token) => sourceTokens.includes(token));
  const impactPrefixes = impactPrefixesFor(entry);
  const matchedPrefix = pathMatchesPrefix(source.path, impactPrefixes);
  if (matchedPrefix && !(source.type === 'doc' && matchedPrefix === 'docs/')) {
    return { matched: true, reason: 'impact-rule', score: 90 };
  }

  if (overlap.length >= 2 || (overlap.length === 1 && source.type !== 'source')) {
    return {
      matched: true,
      reason: `semantic-token:${overlap.join(',')}`,
      score: 40 + overlap.length * 10,
    };
  }

  return { matched: false, reason: 'no-match', score: 0 };
}

export function discoverAdminQualityNeeds() {
  const snapshot = loadMatrixSnapshot();
  const entries = normalizeMatrixEntries(snapshot);
  const impactMap = buildImpactMapFromMatrix(snapshot);
  const sources = buildSources();
  const matchedSourceKeys = new Set();

  const discoveredEntries = entries.map((entry) => {
    const declaredKeys = declaredSourceRefKeys(entry);
    const tokens = tokensForEntry(entry);
    const matches = [];

    for (const source of sources) {
      const match = matchSourceToEntry(source, entry, tokens);
      if (!match.matched) {
        continue;
      }

      const ref = sourceRefFromSource(source);
      const key = sourceRefKey(ref);
      matchedSourceKeys.add(key);
      matches.push({
        ...ref,
        matchReason: match.reason,
        matchScore: match.score,
        alreadyDeclared: declaredKeys.has(key),
      });
    }

    const discoveredSourceRefs = matches
      .sort(
        (left, right) => right.matchScore - left.matchScore || left.path.localeCompare(right.path),
      )
      .slice(0, 40);
    const proposedSourceRefs = discoveredSourceRefs
      .filter((ref) => !ref.alreadyDeclared)
      .slice(0, 10);

    return {
      entryId: entry.id,
      domain: entry.domain,
      need: entry.need,
      confidence: entry.confidence ?? 'medium',
      declaredSourceRefCount: declaredKeys.size,
      discoveredSourceRefCount: discoveredSourceRefs.length,
      proposedSourceRefs,
      discoveredSourceRefs,
    };
  });

  const unmappedSources = sources
    .map((source) => sourceRefFromSource(source))
    .filter((ref) => !matchedSourceKeys.has(sourceRefKey(ref)))
    .slice(0, 100);
  const proposals = discoveredEntries.flatMap((entry) =>
    entry.proposedSourceRefs.map((sourceRef) => ({
      type: 'add-source-ref',
      entryId: entry.entryId,
      sourceRef,
      confidence: sourceRef.matchScore >= 90 ? 'high' : 'medium',
    })),
  );

  return {
    generatedAt: new Date().toISOString(),
    matrix: {
      schemaVersion: snapshot.schemaVersion ?? null,
      generatedAt: snapshot.generatedAt ?? null,
      entryCount: entries.length,
      impactRuleCount: impactMap.rules.length,
      globalImpactPrefixCount: impactMap.globalPrefixes.length,
    },
    sourceCounts: {
      total: sources.length,
      docs: sources.filter((source) => source.type === 'doc').length,
      e2e: sources.filter((source) => source.type === 'e2e').length,
      routes: sources.filter((source) => source.type === 'route').length,
      selectors: sources.filter((source) => source.type === 'selector').length,
      strapiApis: sources.filter((source) => source.type === 'strapi-api').length,
      i18n: sources.filter((source) => source.type === 'i18n').length,
    },
    summary: {
      entriesWithProposals: discoveredEntries.filter((entry) => entry.proposedSourceRefs.length)
        .length,
      proposalCount: proposals.length,
      unmappedSourceCount: unmappedSources.length,
    },
    proposals,
    entries: discoveredEntries,
    unmappedSources,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArguments(process.argv.slice(2));
  const outputPath = path.resolve(repoRoot, args.get('output') ?? DEFAULT_OUTPUT);
  const result = discoverAdminQualityNeeds();
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(
    `Discovered ${result.sourceCounts.total} source(s), ${result.summary.proposalCount} proposal(s), ${result.summary.unmappedSourceCount} unmapped source(s).\n`,
  );
  process.stdout.write(`Wrote ${outputPath}\n`);
}
