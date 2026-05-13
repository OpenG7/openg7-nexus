#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSitemapXml } from './generate-sitemap.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const sitemapPath = path.resolve(projectRoot, 'public/sitemap.xml');

function normalizeLineEndings(value) {
  return value.replace(/\r\n/g, '\n');
}

async function main() {
  const { xml } = await createSitemapXml();
  const current = await readFile(sitemapPath, 'utf8');

  if (normalizeLineEndings(current) !== normalizeLineEndings(xml)) {
    console.error('[sitemap] public/sitemap.xml is out of date.');
    console.error('[sitemap] Run: yarn workspace @openg7/web generate:sitemap');
    process.exitCode = 1;
    return;
  }

  console.log('[sitemap] public/sitemap.xml is up to date.');
}

main().catch((error) => {
  console.error('[sitemap] Validation failed.');
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
