const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadEnv } = require('../config/env');
const { createProxy } = require('../server/proxy');
const { startLocalProxy } = require('../electron/local-proxy');
const config = {};
loadEnv(path.join(__dirname, '..', '.env.example'), [
  'MAX_AUDIO_BYTES', 'ECHONOTE_PROXY_HOST', 'ECHONOTE_PROXY_URL', 'VOLCENGINE_ASR_TIMEOUT_MS'
], config);

test('managed proxy starts independently, applies credential updates and releases its listener', async () => {
  let key = 'first';
  const proxy = await startLocalProxy({ config, getCredentials: () => ({ VOLCENGINE_ASR_ACCESS_KEY: key }),
    transcribeImpl: async (input, _fetch, current) => {
      assert.equal(input.contentType, 'audio/wav');
      assert.equal(input.audio.toString(), 'audio');
      return { text: current.VOLCENGINE_ASR_ACCESS_KEY };
    } });
  try {
    assert.equal(proxy.status().running, true);
    assert.equal((await proxy.transcribe({ buffer: Buffer.from('audio') })).text, 'first');
    key = 'second';
    assert.equal((await proxy.transcribe({ buffer: Buffer.from('audio') })).text, 'second');
  } finally { await proxy.close(); }
  assert.equal(proxy.status().running, false);
  await assert.rejects(proxy.transcribe({ buffer: Buffer.from('audio') }), /已停止/);
});

test('local HTTP rejects unauthenticated clients, oversized requests and sanitizes errors', async t => {
  let calls = 0;
  const server = createProxy({ maxBytes: 4, token: 'test-token', transcribeImpl: async () => {
    calls++;
    throw new Error('secret must never be returned');
  } });
  await new Promise(resolve => server.listen(0, config.ECHONOTE_PROXY_HOST, resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = new URL('/v1/transcriptions', config.ECHONOTE_PROXY_URL);
  url.port = String(server.address().port);
  assert.equal((await fetch(url, { method: 'POST', body: 'abcd' })).status, 401);
  const headers = { authorization: 'Bearer test-token' };
  assert.equal((await fetch(url, { method: 'POST', headers, body: '12345' })).status, 413);
  assert.equal(calls, 0);
  const failed = await fetch(url, { method: 'POST', headers, body: '1234' });
  assert.equal(failed.status, 502);
  assert.doesNotMatch(await failed.text(), /secret/);
  assert.equal(calls, 1);
});

test('missing credentials surface their public error; invalid bind config is rejected', async () => {
  const proxy = await startLocalProxy({ config, getCredentials: () => {
    throw Object.assign(new Error('missing'), { status: 503, publicMessage: '请填写凭据' });
  } });
  try { await assert.rejects(proxy.transcribe({ buffer: Buffer.from('audio') }), /请填写凭据/); }
  finally { await proxy.close(); }
  await assert.rejects(startLocalProxy({ config: { ...config, ECHONOTE_PROXY_HOST: '0.0.0.0' } }), /回环/);
});
