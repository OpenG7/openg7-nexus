import { readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
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

const IMPACT_RULES = [
  {
    entryIds: ['public-discovery'],
    prefixes: [
      'docs/',
      'README.md',
      'index.html',
      'openg7-org/src/app/domains/home/',
      'openg7-org/src/app/shared/components/hero/',
      'openg7-org/src/app/shared/components/layout/site-header',
    ],
  },
  {
    entryIds: ['advanced-discovery'],
    prefixes: [
      'openg7-org/src/app/domains/search/',
      'openg7-org/src/app/shared/components/filters/',
      'openg7-org/src/app/shared/components/search/',
      'openg7-org/src/app/shared/components/company/company-table',
      'openg7-org/src/app/shared/components/company/company-detail',
    ],
  },
  {
    entryIds: ['geospatial'],
    prefixes: [
      'openg7-org/src/app/shared/components/map/',
      'openg7-org/src/app/shared/components/map-frame/',
      'openg7-org/src/app/domains/home/feature/home-map-section/',
      'openg7-org/src/app/domains/home/feature/home-corridors-realtime/',
      'strapi/src/api/corridors/',
      'strapi/src/api/exchange/',
    ],
  },
  {
    entryIds: ['onboarding-imports'],
    prefixes: [
      'openg7-org/src/app/domains/auth/',
      'openg7-org/src/app/company-registration-form/',
      'openg7-org/src/app/import/',
      'strapi/src/api/company-import/',
    ],
  },
  {
    entryIds: ['importation-analytics'],
    prefixes: [
      'openg7-org/src/app/domains/importation/',
      'docs/frontend/importation-page.md',
      'strapi/src/api/importation/',
    ],
  },
  {
    entryIds: ['feed-signals'],
    prefixes: [
      'openg7-org/src/app/domains/feed/',
      'strapi/src/api/feed/',
      'strapi/src/api/hydrocarbon-signal/',
    ],
  },
  {
    entryIds: ['business-lifecycle'],
    prefixes: [
      'openg7-org/src/app/shared/components/company/',
      'openg7-org/src/app/shared/components/partner/',
      'openg7-org/src/app/domains/partners/',
      'strapi/src/api/company/',
    ],
  },
  {
    entryIds: ['linkup-workflow'],
    prefixes: [
      'openg7-org/src/app/domains/matchmaking/',
      'openg7-org/src/app/shared/components/connection/',
      'strapi/src/api/connection/',
    ],
  },
  {
    entryIds: ['alerts-notifications'],
    prefixes: [
      'openg7-org/src/app/shared/components/layout/notification-panel',
      'openg7-org/src/app/domains/account/pages/alerts',
      'strapi/src/api/user-alert/',
    ],
  },
  {
    entryIds: ['account-data'],
    prefixes: [
      'openg7-org/src/app/domains/account/',
      'openg7-org/src/app/core/auth/',
      'strapi/src/api/account-profile/',
      'strapi/src/api/saved-search/',
      'strapi/src/api/user-favorite/',
    ],
  },
  {
    entryIds: ['rbac'],
    prefixes: [
      'openg7-org/src/app/core/auth/',
      'strapi/src/seed/01-roles-permissions',
      'strapi/src/extensions/users-permissions/',
      'strapi/src/policies/',
    ],
  },
  {
    entryIds: ['trust-validation'],
    prefixes: [
      'openg7-org/src/app/domains/admin/pages/admin-trust',
      'openg7-org/src/app/shared/components/partner/',
      'strapi/src/api/admin-quality-',
    ],
  },
];

const GLOBAL_PREFIXES = [
  'AGENTS.md',
  'package.json',
  'openg7-org/src/app/domains/admin/',
  'openg7-org/src/app/core/api/',
  'strapi/src/api/admin-quality-matrix/',
  'packages/contracts/',
  'packages/tooling/',
];

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
