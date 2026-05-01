#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..', '..');
const agentsPath = resolve(repoRoot, 'AGENTS.md');
const appDir = resolve(repoRoot, 'openg7-org', 'src', 'app');

function loadSelectors(markdown) {
  const og7Matches = [...markdown.matchAll(/\[data-og7="([\w-]+)"\]/g)].map(match => match[1]);
  const og7IdMatches = [...markdown.matchAll(/\[data-og7-id="([\w-]+)"\]/g)].map(match => match[1]);

  const uniqueOg7 = new Set(og7Matches);
  const uniqueOg7Ids = new Set(og7IdMatches.filter(id => !['connections', 'more'].includes(id)));

  return {
    og7: Array.from(uniqueOg7),
    og7Ids: Array.from(uniqueOg7Ids),
  };
}

function readAllFiles(dir) {
  const items = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') {
        items.push(...readAllFiles(fullPath));
      }
      continue;
    }

    if (['.ts', '.html', '.json'].includes(extname(fullPath))) {
      items.push([fullPath, readFileSync(fullPath, 'utf8')]);
    }
  }
  return items;
}

function attributeExists(files, attribute, value) {
  const needle = `${attribute}="${value}"`;
  return files.some(([, contents]) => contents.includes(needle));
}

function validateSelectors() {
  const markdown = readFileSync(agentsPath, 'utf8');
  const { og7, og7Ids } = loadSelectors(markdown);
  const files = readAllFiles(appDir);
  const missing = [];

  for (const selector of og7) {
    if (!attributeExists(files, 'data-og7', selector)) {
      missing.push(`data-og7="${selector}"`);
    }
  }

  for (const selector of og7Ids) {
    const hasId = attributeExists(files, 'data-og7-id', selector);
    const hasLayer = attributeExists(files, 'data-og7-layer', selector);
    if (!hasId && !hasLayer) {
      missing.push(`data-og7-id="${selector}"`);
    }
  }

  if (missing.length > 0) {
    console.error('Sélecteurs manquants dans openg7-org/src/app:\n- ' + missing.join('\n- '));
    process.exit(1);
  }

  console.log('OK: tous les sélecteurs d’AGENTS.md existent dans le code.');
}

validateSelectors();
