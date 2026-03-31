import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, '..');
const repoRoot = resolve(webRoot, '..');
const strapiRoot = resolve(repoRoot, 'strapi');
const outputDir = resolve(webRoot, process.env.OG7_E2E_DB_REPORT_DIR ?? 'test-results');
const reportBaseName = process.env.OG7_E2E_DB_REPORT_NAME ?? 'playwright-db-report';
const snapshotPath = resolve(outputDir, `${reportBaseName}.before.json`);
const diffJsonPath = resolve(outputDir, `${reportBaseName}.diff.json`);
const diffMarkdownPath = resolve(outputDir, `${reportBaseName}.diff.md`);

const DEFAULT_REPORT_TABLES = [
  'feed_items',
  'hydrocarbon_signals',
  'companies',
  'up_users',
  'user_alerts',
  'user_favorites',
  'saved_searches',
  'import_watchlists',
  'import_annotations',
  'import_report_schedules',
];

const DEFAULT_GUARD_TABLES = [
  'companies',
  'up_users',
  'sectors',
  'provinces',
  'exchanges',
  'connections',
  'homepage',
  'billing_plans',
];

function readCliMode() {
  const modeIndex = process.argv.indexOf('--mode');
  if (modeIndex >= 0 && process.argv[modeIndex + 1]) {
    return process.argv[modeIndex + 1];
  }
  return process.env.OG7_E2E_DB_REPORT_MODE ?? 'report';
}

function parseList(value, fallback = []) {
  const items = (value ?? '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);

  return items.length > 0 ? items : fallback;
}

function resolveDatabaseTarget() {
  const client = (process.env.DATABASE_CLIENT ?? 'sqlite').toLowerCase();
  const filename = process.env.DATABASE_FILENAME ?? 'db.sqlite';
  const dbPath = process.env.OG7_E2E_DB_PATH ?? resolve(strapiRoot, 'data', filename);

  return { client, dbPath, filename };
}

function selectTables(db) {
  const explicitTables = parseList(process.env.OG7_E2E_DB_REPORT_TABLES, DEFAULT_REPORT_TABLES);

  if (explicitTables.length > 0) {
    return explicitTables;
  }

  return db
    .prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name")
    .all()
    .map(row => row.name);
}

function pickSampleColumns(columns) {
  const preferred = ['id', 'document_id', 'slug', 'title', 'name', 'created_at', 'updated_at', 'published_at', 'status'];
  const found = preferred.filter(column => columns.includes(column));
  const extra = columns.filter(column => !found.includes(column)).slice(0, Math.max(0, 8 - found.length));
  return [...found, ...extra];
}

function toTableFingerprint(tableReport) {
  return JSON.stringify({
    rowCount: tableReport.rowCount,
    sampleColumns: tableReport.sampleColumns,
    sampleRows: tableReport.sampleRows,
  });
}

function buildOrderBy(columns) {
  if (columns.includes('updated_at')) {
    return 'updated_at desc';
  }
  if (columns.includes('created_at')) {
    return 'created_at desc';
  }
  if (columns.includes('id')) {
    return 'id desc';
  }
  return 'rowid desc';
}

function inspectSqlite(dbPath) {
  const db = new Database(dbPath, { readonly: true });

  try {
    const tables = selectTables(db);
    const limit = Number.parseInt(process.env.OG7_E2E_DB_REPORT_LIMIT ?? '5', 10);
    const tableReports = tables.map(tableName => {
      const columns = db.prepare(`pragma table_info('${tableName.replace(/'/g, "''")}')`).all().map(row => row.name);
      const rowCount = db.prepare(`select count(*) as count from "${tableName}"`).get().count;
      const sampleColumns = pickSampleColumns(columns);
      const orderBy = buildOrderBy(columns);
      const sampleRows = rowCount > 0
        ? db.prepare(`select ${sampleColumns.map(column => `"${column}"`).join(', ')} from "${tableName}" order by ${orderBy} limit ?`).all(limit)
        : [];

      return {
        tableName,
        rowCount,
        columns,
        sampleColumns,
        sampleRows,
        fingerprint: toTableFingerprint({ rowCount, sampleColumns, sampleRows }),
      };
    });

    return {
      status: 'ok',
      client: 'sqlite',
      dbPath,
      generatedAt: new Date().toISOString(),
      tableCount: tableReports.length,
      tables: tableReports,
    };
  } finally {
    db.close();
  }
}

function buildUnsupportedReport(target) {
  return {
    status: 'unsupported',
    client: target.client,
    dbPath: target.dbPath,
    generatedAt: new Date().toISOString(),
    message: 'Only sqlite databases are currently supported by the Playwright DB report generator.',
    tables: [],
  };
}

function loadSnapshot() {
  if (!existsSync(snapshotPath)) {
    return null;
  }

  return JSON.parse(readFileSync(snapshotPath, 'utf8'));
}

function indexTables(report) {
  return new Map(report.tables.map(table => [table.tableName, table]));
}

function buildDiff(beforeReport, afterReport) {
  if (!beforeReport || beforeReport.status !== 'ok' || afterReport.status !== 'ok') {
    return {
      status: 'unavailable',
      generatedAt: new Date().toISOString(),
      message: 'A comparable before/after snapshot is not available.',
      changedTables: [],
      guardTables: parseList(process.env.OG7_E2E_DB_WRITE_GUARD_TABLES, DEFAULT_GUARD_TABLES),
      unexpectedWrites: [],
    };
  }

  const beforeTables = indexTables(beforeReport);
  const afterTables = indexTables(afterReport);
  const allTableNames = Array.from(new Set([...beforeTables.keys(), ...afterTables.keys()])).sort();
  const changedTables = allTableNames.flatMap(tableName => {
    const beforeTable = beforeTables.get(tableName);
    const afterTable = afterTables.get(tableName);
    const beforeCount = beforeTable?.rowCount ?? 0;
    const afterCount = afterTable?.rowCount ?? 0;
    const rowDelta = afterCount - beforeCount;
    const beforeFingerprint = beforeTable?.fingerprint ?? null;
    const afterFingerprint = afterTable?.fingerprint ?? null;
    const changed = rowDelta !== 0 || beforeFingerprint !== afterFingerprint;

    if (!changed) {
      return [];
    }

    return [{
      tableName,
      beforeCount,
      afterCount,
      rowDelta,
      fingerprintChanged: beforeFingerprint !== afterFingerprint,
      beforeSampleRows: beforeTable?.sampleRows ?? [],
      afterSampleRows: afterTable?.sampleRows ?? [],
    }];
  });

  const guardTables = parseList(process.env.OG7_E2E_DB_WRITE_GUARD_TABLES, DEFAULT_GUARD_TABLES);
  const unexpectedWrites = changedTables.filter(table => guardTables.includes(table.tableName));

  return {
    status: unexpectedWrites.length > 0 ? 'failed' : 'ok',
    generatedAt: new Date().toISOString(),
    beforeGeneratedAt: beforeReport.generatedAt,
    afterGeneratedAt: afterReport.generatedAt,
    guardTables,
    changedTables,
    unexpectedWrites,
  };
}

function formatValue(value) {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function buildDiffMarkdown(diff) {
  const lines = [
    '# Playwright DB Diff Report',
    '',
    `- Status: ${diff.status}`,
    `- Generated at: ${diff.generatedAt}`,
    `- Guard tables: ${diff.guardTables?.join(', ') || 'none'}`,
  ];

  if (diff.status === 'unavailable') {
    lines.push(`- Message: ${diff.message}`);
    return `${lines.join('\n')}\n`;
  }

  lines.push(`- Changed tables: ${diff.changedTables.length}`, `- Unexpected writes: ${diff.unexpectedWrites.length}`, '');

  if (diff.changedTables.length === 0) {
    lines.push('_No DB changes detected between the Playwright before/after snapshots._', '');
    return `${lines.join('\n')}\n`;
  }

  for (const table of diff.changedTables) {
    lines.push(`## ${table.tableName}`, '', `- Before rows: ${table.beforeCount}`, `- After rows: ${table.afterCount}`, `- Row delta: ${table.rowDelta}`, `- Fingerprint changed: ${table.fingerprintChanged ? 'yes' : 'no'}`);
    if (diff.guardTables.includes(table.tableName)) {
      lines.push('- Guarded table: yes');
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function buildMarkdown(report) {
  const lines = [
    '# Playwright DB Report',
    '',
    `- Status: ${report.status}`,
    `- Client: ${report.client}`,
    `- Database: ${report.dbPath}`,
    `- Generated at: ${report.generatedAt}`,
  ];

  if (report.status !== 'ok') {
    lines.push(`- Message: ${report.message}`);
    return `${lines.join('\n')}\n`;
  }

  lines.push(`- Tables inspected: ${report.tableCount}`, '');

  for (const table of report.tables) {
    lines.push(`## ${table.tableName}`, '', `- Rows: ${table.rowCount}`, `- Sample columns: ${table.sampleColumns.join(', ') || 'none'}`, '');

    if (table.sampleRows.length === 0) {
      lines.push('_No rows found._', '');
      continue;
    }

    lines.push(`| ${table.sampleColumns.join(' | ')} |`, `| ${table.sampleColumns.map(() => '---').join(' | ')} |`);
    for (const row of table.sampleRows) {
      lines.push(`| ${table.sampleColumns.map(column => formatValue(row[column]).replace(/\|/g, '\\|')).join(' | ')} |`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function writeReportFiles(report) {
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = resolve(outputDir, `${reportBaseName}.json`);
  const markdownPath = resolve(outputDir, `${reportBaseName}.md`);

  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(markdownPath, buildMarkdown(report), 'utf8');

  console.log(`[playwright-db-report] JSON  -> ${jsonPath}`);
  console.log(`[playwright-db-report] Markdown -> ${markdownPath}`);
}

function writeSnapshotFile(report) {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(snapshotPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[playwright-db-report] Snapshot -> ${snapshotPath}`);
}

function writeDiffFiles(diff) {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(diffJsonPath, `${JSON.stringify(diff, null, 2)}\n`, 'utf8');
  writeFileSync(diffMarkdownPath, buildDiffMarkdown(diff), 'utf8');
  console.log(`[playwright-db-report] Diff JSON -> ${diffJsonPath}`);
  console.log(`[playwright-db-report] Diff Markdown -> ${diffMarkdownPath}`);
}

function cleanupSnapshotFile() {
  if (existsSync(snapshotPath)) {
    unlinkSync(snapshotPath);
  }
}

function main() {
  const mode = readCliMode();
  const target = resolveDatabaseTarget();
  const report = target.client === 'sqlite' ? inspectSqlite(target.dbPath) : buildUnsupportedReport(target);

  if (mode === 'snapshot') {
    writeSnapshotFile(report);
    return;
  }

  const beforeReport = loadSnapshot();
  writeReportFiles(report);
  const diff = buildDiff(beforeReport, report);
  writeDiffFiles(diff);
  cleanupSnapshotFile();

  if (diff.unexpectedWrites.length > 0) {
    console.error('[playwright-db-report] Unexpected writes detected in guarded tables:');
    for (const table of diff.unexpectedWrites) {
      console.error(`- ${table.tableName}: before=${table.beforeCount}, after=${table.afterCount}, delta=${table.rowDelta}`);
    }
    process.exitCode = 1;
  }
}

main();
