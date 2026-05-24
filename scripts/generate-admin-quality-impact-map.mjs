import { readFileSync, writeFileSync } from 'node:fs';

import {
  buildImpactMapFromMatrix,
  impactMapPath,
  loadMatrixSnapshot,
} from './admin-quality-matrix-model.mjs';

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

const checkOnly = process.argv.includes('--check');
const impactMap = buildImpactMapFromMatrix(loadMatrixSnapshot());
const nextContent = stableJson(impactMap);

if (checkOnly) {
  const currentContent = readFileSync(impactMapPath, 'utf8');
  if (currentContent !== nextContent) {
    console.error(
      'tools/admin-quality-matrix-impact-map.json is out of sync. Run `yarn generate:admin-quality-impact-map`.',
    );
    process.exit(1);
  }
  process.stdout.write('Admin quality impact map is in sync.\n');
} else {
  writeFileSync(impactMapPath, nextContent, 'utf8');
  process.stdout.write(`Generated ${impactMapPath}\n`);
}
