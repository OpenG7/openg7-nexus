#!/usr/bin/env node
/**
 * Generates docs/agent-context.md — the compact system documentation injected
 * into the AI chat agent's system prompt.
 *
 * Run: yarn docs:agent
 *
 * Sources (in order):
 *  1. Key markdown docs from docs/ (architecture, governance, APIs)
 *  2. Strapi route inventory (auto-discovered from routes files)
 *  3. Angular domain + page inventory (auto-discovered from src/app/domains)
 *  4. Package public API exports (from public-api.ts files)
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readDoc(relPath, maxChars = 8_000) {
  const fullPath = resolve(ROOT, relPath);
  if (!existsSync(fullPath)) return null;
  const content = readFileSync(fullPath, 'utf8').trim();
  if (content.length <= maxChars) return content;
  return content.slice(0, maxChars) + '\n\n[... tronqué]';
}

function listFiles(dir, ext) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((f) => join(dir, f));
}

function listSubdirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => {
    try {
      return statSync(join(dir, f)).isDirectory();
    } catch {
      return false;
    }
  });
}

// ─── 1. Key markdown documentation ───────────────────────────────────────────

const DOCS_SOURCES = [
  { label: 'Écosystème (carte des dépôts)', path: 'docs/ecosystem/ECOSYSTEM-MAP.md', max: 4_000 },
  { label: 'Architecture Angular (structure domaines)', path: 'docs/frontend/angular-domain-structure.md', max: 5_000 },
  { label: 'Gouvernance matrice qualité (règles, propositions, workflow CI)', path: 'docs/frontend/admin-quality-governance.md', max: 10_000 },
  { label: 'Agent admin-quality (commandes, actions allowlistées)', path: 'docs/frontend/admin-quality-agent.md', max: 4_000 },
  { label: 'Sync matrice qualité ↔ Strapi (ingest, recalcul)', path: 'docs/strapi/admin-quality-matrix-sync.md', max: 6_000 },
  { label: 'APIs temps réel Strapi', path: 'docs/strapi/realtime-apis.md', max: 4_000 },
  { label: 'Dispatch Codex (opérations via IA)', path: 'docs/strapi/admin-ops-codex-dispatch.md', max: 5_000 },
  { label: 'Cas d\'usage métier', path: 'docs/cas-d-usage-en-langage-courant.md', max: 5_000 },
  { label: 'Roadmap', path: 'docs/roadmap.md', max: 4_000 },
];

const markdownSections = [];
for (const source of DOCS_SOURCES) {
  const content = readDoc(source.path, source.max);
  if (content) {
    markdownSections.push(`### ${source.label}\n\n${content}`);
  }
}

// ─── 2. Strapi route inventory ────────────────────────────────────────────────

const STRAPI_ROUTES_DIR = resolve(ROOT, 'strapi/src/api');
const routeLines = [];

if (existsSync(STRAPI_ROUTES_DIR)) {
  for (const apiDir of listSubdirs(STRAPI_ROUTES_DIR)) {
    const routesDir = join(STRAPI_ROUTES_DIR, apiDir, 'routes');
    for (const routeFile of listFiles(routesDir, '.ts')) {
      const src = readFileSync(routeFile, 'utf8');
      const matches = [...src.matchAll(/method:\s*'(\w+)'[^}]*path:\s*'([^']+)'[^}]*handler:\s*'([^']+)'/gs)];
      for (const m of matches) {
        routeLines.push(`  ${m[1].padEnd(6)} ${m[2].padEnd(60)} → ${m[3]}`);
      }
    }
  }
}

// ─── 3. Angular domain + page inventory ──────────────────────────────────────

const DOMAINS_DIR = resolve(ROOT, 'openg7-org/src/app/domains');
const domainLines = [];

if (existsSync(DOMAINS_DIR)) {
  for (const domain of listSubdirs(DOMAINS_DIR)) {
    const domainPath = join(DOMAINS_DIR, domain);
    const pages = [];

    for (const sub of ['pages', 'feature']) {
      const subPath = join(domainPath, sub);
      if (existsSync(subPath)) {
        const files = readdirSync(subPath)
          .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.endsWith('.stories.ts'))
          .map((f) => basename(f, '.ts'));
        pages.push(...files);
      }
    }

    domainLines.push(`  ${domain.padEnd(18)} ${pages.join(', ')}`);
  }
}

// ─── 4. Package public API exports ───────────────────────────────────────────

const PACKAGES_DIR = resolve(ROOT, 'packages');
const packageExports = [];

if (existsSync(PACKAGES_DIR)) {
  for (const pkg of listSubdirs(PACKAGES_DIR)) {
    const publicApiPath = join(PACKAGES_DIR, pkg, 'src/public-api.ts');
    if (!existsSync(publicApiPath)) continue;

    const src = readFileSync(publicApiPath, 'utf8');
    const exports = [...src.matchAll(/export \* from '(.+?)'/g)].map((m) => m[1]);
    packageExports.push(`  @openg7/${pkg} (${exports.length} modules) : ${exports.join(', ')}`);
  }
}

// ─── 5. Assemble output ───────────────────────────────────────────────────────

const now = new Date().toISOString();

const output = `# Contexte système OpenG7 — généré le ${now}

> Ce fichier est généré automatiquement par \`yarn docs:agent\`.
> Ne pas modifier manuellement — relancer la commande pour mettre à jour.

---

## Documentation architecturale

${markdownSections.join('\n\n---\n\n')}

---

## Endpoints Strapi disponibles

\`\`\`
${routeLines.length > 0 ? routeLines.join('\n') : '(aucun trouvé)'}
\`\`\`

---

## Domaines Angular et pages

\`\`\`
${domainLines.length > 0 ? domainLines.join('\n') : '(aucun trouvé)'}
\`\`\`

---

## Packages @openg7 (public API)

\`\`\`
${packageExports.length > 0 ? packageExports.join('\n') : '(aucun trouvé)'}
\`\`\`
`;

const outPath = resolve(ROOT, 'docs/agent-context.md');
writeFileSync(outPath, output, 'utf8');

const kb = Math.round(output.length / 1024);
console.log(`✓ docs/agent-context.md généré — ${kb} Ko, ${output.split('\n').length} lignes`);
