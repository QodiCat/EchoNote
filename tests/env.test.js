const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadEnv } = require('../config/env');

test('loads only allowed settings and preserves existing environment values', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'echonote-env-'));
  const file = path.join(directory, '.env');
  try {
    fs.writeFileSync(file, 'ECHONOTE_PROXY_URL="http://example.test"\nVOLCENGINE_ASR_ACCESS_KEY=test-only\nELECTRON_RUN_AS_NODE=1\n');
    const target = {};
    loadEnv(file, ['ECHONOTE_PROXY_URL'], target);
    assert.deepEqual(target, { ECHONOTE_PROXY_URL: 'http://example.test' });
    target.ECHONOTE_PROXY_URL = 'http://existing.test';
    loadEnv(file, ['ECHONOTE_PROXY_URL'], target);
    assert.equal(target.ECHONOTE_PROXY_URL, 'http://existing.test');
  } finally {
    fs.unlinkSync(file);
    fs.rmdirSync(directory);
  }
});

test('allows a missing .env without concealing other filesystem errors', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'echonote-env-'));
  try {
    assert.doesNotThrow(() => loadEnv(path.join(directory, 'missing'), []));
    assert.throws(() => loadEnv(directory, []));
  } finally {
    fs.rmdirSync(directory);
  }
});
