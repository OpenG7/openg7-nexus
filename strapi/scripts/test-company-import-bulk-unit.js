/* eslint-disable no-console */
const assert = require('node:assert/strict');

require('ts-node/register/transpile-only');
const { __testing } = require('../src/api/company-import/services/company-import-bulk-jobs.ts');

function runParseCompanyTests() {
  const valid = __testing.parseCompany({
    businessId: 'ab-123',
    name: 'Acme Corp',
    sectors: ['Energy'],
    location: { lat: 45.5, lng: -73.6, province: 'QC', country: 'Canada' },
    contacts: { website: 'https://acme.test' },
  });

  assert.equal(valid.businessId, 'AB-123', 'Expected businessId uppercased.');
  assert.equal(valid.name, 'Acme Corp', 'Expected normalized company name.');
  assert.equal(valid.sectors.length, 1, 'Expected one normalized sector.');

  assert.throws(
    () =>
      __testing.parseCompany({
        businessId: '',
        name: 'A',
        sectors: [],
        location: { lat: 120, lng: 400 },
      }),
    /businessId is required|name is required|sectors must contain|coordinates are out of range/i,
    'Expected invalid payload to throw parsing error.'
  );
}

function runOptionsParsingTests() {
  const parsed = __testing.parseBulkImportHeadersAndOptions({
    body: { mode: 'validate-only', dryRun: false },
    headers: { 'idempotency-key': 'abc-123' },
  });
  assert.equal(parsed.mode, 'validate-only', 'Expected validate-only mode.');
  assert.equal(parsed.dryRun, true, 'Expected dryRun forced to true in validate-only mode.');
  assert.equal(parsed.idempotencyKey, 'abc-123', 'Expected idempotency key from headers.');

  const fallback = __testing.parseBulkImportHeadersAndOptions({
    body: {},
    headers: {},
  });
  assert.equal(fallback.mode, 'upsert', 'Expected default mode to upsert.');
  assert.equal(fallback.dryRun, false, 'Expected default dryRun to false.');
}

function runStateTransitionTests() {
  assert.equal(
    __testing.resolveTerminalState(new Error('boom')),
    'failed',
    'Expected generic error to map to failed state.'
  );
  assert.equal(
    __testing.resolveTerminalState({}),
    'failed',
    'Expected unknown error object to map to failed state.'
  );
}

function run() {
  runParseCompanyTests();
  runOptionsParsingTests();
  runStateTransitionTests();
  console.log('Company bulk import unit tests passed.');
}

run();
