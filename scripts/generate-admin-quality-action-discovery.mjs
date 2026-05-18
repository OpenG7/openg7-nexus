import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const appRoot = path.join(repoRoot, 'openg7-org', 'src', 'app');
const adminQualityPackageRoot = path.join(repoRoot, 'packages', 'admin-quality', 'src', 'lib');
const e2eRoot = path.join(repoRoot, 'openg7-org', 'e2e');
const outputFile = path.join(
  adminQualityPackageRoot,
  'pages',
  'admin-quality-action-discovery.generated.ts',
);
const checkOnly = process.argv.includes('--check');

function walkFiles(rootDir, matcher) {
  const results = [];
  const queue = [rootDir];

  while (queue.length) {
    const currentDir = queue.pop();
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolutePath);
        continue;
      }
      if (matcher(absolutePath)) {
        results.push(absolutePath);
      }
    }
  }

  return results.sort((left, right) => left.localeCompare(right));
}

function toPosixRelative(absolutePath) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join('/');
}

function findLineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function detectTrigger(tagName, attributesSource) {
  if (tagName === 'a') {
    return 'link';
  }

  const typeMatch = attributesSource.match(/\btype\s*=\s*"([^"]+)"/i);
  if (typeMatch?.[1]?.toLowerCase() === 'submit') {
    return 'submit';
  }

  return 'button';
}

function collectDiscoveredActions() {
  const htmlFiles = [appRoot, adminQualityPackageRoot].flatMap((root) =>
    walkFiles(root, (filePath) => filePath.endsWith('.html')),
  );
  const actionMap = new Map();
  const elementPattern = /<(button|a)\b[\s\S]*?>/gi;

  for (const absolutePath of htmlFiles) {
    const source = readFileSync(absolutePath, 'utf8');
    let match = elementPattern.exec(source);

    while (match) {
      const [tagSource, tagName] = match;
      const idMatch = tagSource.match(/\bdata-og7-id\s*=\s*"([^"]+)"/i);
      if (idMatch) {
        const id = idMatch[1].trim();
        const relativePath = toPosixRelative(absolutePath);
        const hasActionHook = /\bdata-og7\s*=\s*"action"/i.test(tagSource);
        const trigger = detectTrigger(tagName.toLowerCase(), tagSource);
        const line = findLineNumber(source, match.index);
        const existing = actionMap.get(id) ?? {
          id,
          trigger,
          hasActionHook: false,
          sourceFiles: [],
          specFiles: [],
          e2eFiles: [],
        };

        existing.hasActionHook = existing.hasActionHook || hasActionHook;
        existing.sourceFiles.push({
          file: relativePath,
          line,
          tag: tagName.toLowerCase(),
          trigger,
          hasActionHook,
        });
        actionMap.set(id, existing);
      }

      match = elementPattern.exec(source);
    }
  }

  const appSpecFiles = [appRoot, adminQualityPackageRoot].flatMap((root) =>
    walkFiles(root, (filePath) => filePath.endsWith('.spec.ts')),
  );
  const e2eSpecFiles = walkFiles(e2eRoot, (filePath) => filePath.endsWith('.spec.ts'));

  for (const action of actionMap.values()) {
    const lookupNeedle = `data-og7-id="${action.id}"`;

    for (const absolutePath of appSpecFiles) {
      const source = readFileSync(absolutePath, 'utf8');
      if (source.includes(lookupNeedle)) {
        action.specFiles.push(toPosixRelative(absolutePath));
      }
    }

    for (const absolutePath of e2eSpecFiles) {
      const source = readFileSync(absolutePath, 'utf8');
      if (source.includes(lookupNeedle)) {
        action.e2eFiles.push(toPosixRelative(absolutePath));
      }
    }

    action.sourceFiles.sort(
      (left, right) => left.file.localeCompare(right.file) || left.line - right.line,
    );
    action.specFiles.sort((left, right) => left.localeCompare(right));
    action.e2eFiles.sort((left, right) => left.localeCompare(right));
  }

  return Array.from(actionMap.values()).sort((left, right) => left.id.localeCompare(right.id));
}

function escapeString(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

function isPrimitiveLiteral(value) {
  return ['string', 'number', 'boolean'].includes(typeof value) || value === null;
}

function renderPrimitiveLiteral(value) {
  if (typeof value === 'string') {
    return `'${escapeString(value)}'`;
  }
  if (value === null) {
    return 'null';
  }
  return String(value);
}

function renderTypeScriptLiteral(value, indentLevel = 0, inlinePrefixLength = 0) {
  if (isPrimitiveLiteral(value)) {
    return renderPrimitiveLiteral(value);
  }

  const indent = ' '.repeat(indentLevel);
  const childIndent = ' '.repeat(indentLevel + 2);

  if (Array.isArray(value)) {
    if (!value.length) {
      return '[]';
    }

    if (value.every(isPrimitiveLiteral)) {
      const inline = `[${value.map(renderPrimitiveLiteral).join(', ')}]`;
      const lineLength = inlinePrefixLength
        ? inlinePrefixLength + inline.length
        : indent.length + inline.length;
      if (lineLength <= 99) {
        return inline;
      }
    }

    return `[
${value
  .map((item) => `${childIndent}${renderTypeScriptLiteral(item, indentLevel + 2)},`)
  .join('\n')}
${indent}]`;
  }

  const entries = Object.entries(value);
  if (!entries.length) {
    return '{}';
  }

  return `{
${entries
  .map(([key, item]) => {
    const prefix = `${childIndent}${key}: `;
    return `${prefix}${renderTypeScriptLiteral(item, indentLevel + 2, prefix.length)},`;
  })
  .join('\n')}
${indent}}`;
}

function renderGeneratedModule(actions) {
  return `/* auto-generated by scripts/generate-admin-quality-action-discovery.mjs */

export interface GeneratedAdminQualityActionSourceFile {
  readonly file: string;
  readonly line: number;
  readonly tag: 'button' | 'a';
  readonly trigger: 'button' | 'link' | 'submit';
  readonly hasActionHook: boolean;
}

export interface GeneratedAdminQualityActionDiscovery {
  readonly id: string;
  readonly trigger: 'button' | 'link' | 'submit';
  readonly hasActionHook: boolean;
  readonly sourceFiles: readonly GeneratedAdminQualityActionSourceFile[];
  readonly specFiles: readonly string[];
  readonly e2eFiles: readonly string[];
}

export const GENERATED_ADMIN_QUALITY_ACTION_DISCOVERY = ${renderTypeScriptLiteral(actions)} as const satisfies readonly GeneratedAdminQualityActionDiscovery[];
`;
}

function main() {
  const actions = collectDiscoveredActions();
  const renderedModule = renderGeneratedModule(actions);

  if (checkOnly) {
    const existingModule = readFileSync(outputFile, 'utf8');
    if (existingModule !== renderedModule) {
      process.stderr.write(
        'admin-quality action discovery is out of date. Run yarn generate:quality-actions and commit the generated file.\n',
      );
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`Verified ${actions.length} discovered admin-quality actions\n`);
    return;
  }

  mkdirSync(path.dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, renderedModule, 'utf8');
  const relativeOutput = toPosixRelative(outputFile);
  process.stdout.write(`Generated ${actions.length} discovered actions in ${relativeOutput}\n`);
}

main();
