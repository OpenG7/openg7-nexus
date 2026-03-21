#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import ts from 'typescript';

const repoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const checklistPath = path.join(repoRoot, 'openg7-org', 'CHECKLIST.md');
const appConfigPath = path.join(repoRoot, 'openg7-org', 'src', 'app', 'app.config.ts');
const appRoutesPath = path.join(repoRoot, 'openg7-org', 'src', 'app', 'app.routes.ts');

const checkOnly = process.argv.includes('--check');

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function directoryExists(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function fileExists(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function countMatchesInDir(dirPath, regex, extensions) {
  let total = 0;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += await countMatchesInDir(entryPath, regex, extensions);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (extensions && !extensions.includes(path.extname(entry.name))) {
      continue;
    }

    const content = await fs.readFile(entryPath, 'utf8');
    const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
    const matches = content.match(globalRegex);
    total += matches ? matches.length : 0;
  }
  return total;
}

async function parseTypeScript(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    path.basename(filePath),
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  return { content, sourceFile };
}

async function computeChecklistState() {
  const { content: appConfigContent, sourceFile: appConfigSource } = await parseTypeScript(appConfigPath);
  const { content: appRoutesContent } = await parseTypeScript(appRoutesPath);

  const checklistRoot = path.join(repoRoot, 'openg7-org', 'src', 'app');

  const arborescenceOk = await Promise.all([
    directoryExists(path.join(checklistRoot, 'core', 'security')),
    directoryExists(path.join(checklistRoot, 'core', 'auth')),
    directoryExists(path.join(checklistRoot, 'domains')),
  ]).then(results => results.every(Boolean));

  const selectorOccurrences = await countMatchesInDir(
    checklistRoot,
    /data-og7/,
    ['.html', '.ts']
  );
  const selectorsOk = selectorOccurrences >= 10;

  const signalOccurrences = await countMatchesInDir(
    checklistRoot,
    /signal\(/,
    ['.ts']
  );
  const signalsOk = signalOccurrences >= 5;

  let storeKeys = [];
  let interceptorsOk = false;
  ts.forEachChild(appConfigSource, function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === 'provideStore') {
        const [arg] = node.arguments;
        if (arg && ts.isObjectLiteralExpression(arg)) {
          storeKeys = arg.properties
            .filter(ts.isPropertyAssignment)
            .map(property => {
              const name = property.name;
              if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
                return name.text;
              }
              return undefined;
            })
            .filter(Boolean);
        }
      }

      if (node.expression.text === 'provideHttpClient') {
        const [arg] = node.arguments;
        if (arg && ts.isCallExpression(arg) && ts.isIdentifier(arg.expression) && arg.expression.text === 'withInterceptors') {
          const [interceptorsArg] = arg.arguments;
          if (interceptorsArg && ts.isArrayLiteralExpression(interceptorsArg)) {
            const interceptors = interceptorsArg.elements
              .filter(ts.isIdentifier)
              .map(identifier => identifier.text);
            interceptorsOk = ['authInterceptor', 'csrfInterceptor', 'errorInterceptor'].every(name =>
              interceptors.includes(name)
            );
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  });

  const expectedStoreKeys = [
    'auth',
    'user',
    'catalog',
    'map',
    'companyImportBulk',
    'connections',
    'feed',
    'statistics',
  ];
  const ngrxOk =
    storeKeys.length === expectedStoreKeys.length &&
    expectedStoreKeys.every(key => storeKeys.includes(key));

  const i18nAssetsOk = await Promise.all([
    fileExists(path.join(repoRoot, 'openg7-org', 'src', 'assets', 'i18n', 'fr.json')),
    fileExists(path.join(repoRoot, 'openg7-org', 'src', 'assets', 'i18n', 'en.json')),
  ]).then(results => results.every(Boolean));
  const i18nProviderConfigured =
    appConfigContent.includes('provideTranslateService') || appConfigContent.includes('TranslateModule.forRoot');
  const i18nOk = i18nAssetsOk && appConfigContent.includes('AppTranslateLoader') && i18nProviderConfigured;

  const guardsOk = /canMatch\s*:\s*\[/.test(appRoutesContent) && appRoutesContent.includes('roleGuard');

  const ssrOk = appConfigContent.includes('TransferState') && appConfigContent.includes('provideClientHydration');

  const seedDir = path.join(repoRoot, 'strapi', 'src', 'seed');
  const seedFiles = (await fs.readdir(seedDir)).filter(file => file.endsWith('.ts'));
  const seedsOk = seedFiles.length >= 5;

  const e2eDir = path.join(repoRoot, 'openg7-org', 'e2e');
  const e2eFiles = await fs.readdir(e2eDir);
  let e2eDataSelectors = 0;
  for (const file of e2eFiles) {
    if (!file.endsWith('.ts')) {
      continue;
    }
    const content = await fs.readFile(path.join(e2eDir, file), 'utf8');
    if (/data-og7/.test(content)) {
      e2eDataSelectors += 1;
    }
  }
  const e2eOk = e2eFiles.some(file => file.endsWith('.spec.ts')) && e2eDataSelectors > 0;

  return new Map([
    ["Créer l'arborescence d'accès & sécurité (section 3) sous `src/app/...`.", arborescenceOk],
    [
      'Générer les composants listés en 1) avec leurs selectors HTML respectifs.',
      selectorsOk,
    ],
    ['Implémenter les signals locaux & formulaires typés dans chaque composant.', signalsOk],
    [
      'Brancher NgRx pour les slices globales et workflows documentés : `auth`, `user`, `catalog`, `map`, `companyImportBulk`, `connections`, `feed`, `statistics`.',
      ngrxOk,
    ],
    ['Configurer i18n (loader HTTP, fichiers `fr.json` / `en.json`).', i18nOk],
    ['Activer les interceptors `auth`, `csrf`, `error`.', interceptorsOk],
    ['Protéger les routes (`canMatch` + RBAC UI).', guardsOk],
    ['Configurer SSR (TransferState, aucun accès direct à `window`).', ssrOk],
    ['Côté Strapi : créer les fichiers de seed (section 5), rendre les scripts idempotents.', seedsOk],
    ['Écrire des tests rapides (E2E/ciblage via `data-og7*`).', e2eOk],
  ]);
}

async function synchronizeChecklist() {
  const checklistContent = await fs.readFile(checklistPath, 'utf8');
  const state = await computeChecklistState();

  let updatedContent = checklistContent;
  for (const [label, done] of state.entries()) {
    const pattern = new RegExp(`- \\[[ x]\\] ${escapeRegExp(label)}`);
    const replacement = `- [${done ? 'x' : ' '}] ${label}`;
    updatedContent = updatedContent.replace(pattern, replacement);
  }

  const hasChanged = updatedContent !== checklistContent;

  for (const [label, done] of state.entries()) {
    console.log(`${done ? '✔' : '✘'} ${label}`);
  }

  if (hasChanged) {
    if (checkOnly) {
      console.error('CHECKLIST.md is out of sync with the project state. Run `yarn sync:checklist` to update it.');
      process.exitCode = 1;
      return;
    }

    await fs.writeFile(checklistPath, `${updatedContent.trim()}\n`, 'utf8');
    console.log('CHECKLIST.md has been synchronized with the current project state.');
  } else {
    console.log('CHECKLIST.md is up to date.');
  }
}

synchronizeChecklist().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
