const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createServiceSettings } = require('../electron/service-settings');

async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'echonote-settings-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const key = crypto.randomBytes(32);
  // Test double for safeStorage; actual Windows encryption needs Electron verification.
  const safeStorage = {
    isEncryptionAvailable: () => true,
    encryptString(value) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), data]);
    },
    decryptString(value) {
      const cipher = crypto.createDecipheriv('aes-256-gcm', key, value.subarray(0, 12));
      cipher.setAuthTag(value.subarray(12, 28));
      return Buffer.concat([cipher.update(value.subarray(28)), cipher.final()]).toString();
    }
  };
  const filePath = path.join(dir, 'transcription.env');
  return { filePath, safeStorage, create: () => createServiceSettings({ filePath, safeStorage }) };
}

test('credentials are encrypted on disk, restored after restart, and absent from status', async t => {
  const f = await fixture(t);
  const store = f.create();
  assert.equal((await store.initialize()).configured, false);
  assert.throws(() => store.config(), /设置/);
  const input = { appId: '123456', accessToken: 'private-token-test' };
  await store.save(input);
  const disk = await fs.readFile(f.filePath, 'utf8');
  assert.doesNotMatch(disk, /123456|private-token-test/);
  assert.deepEqual(store.status(), { configured: true, error: '' });
  const restarted = f.create();
  assert.equal((await restarted.initialize()).configured, true);
  assert.equal(restarted.config().VOLCENGINE_ASR_ACCESS_KEY, input.accessToken);
  await restarted.save({ appId: '789', accessToken: 'replacement' });
  assert.equal(restarted.config().VOLCENGINE_ASR_ACCESS_KEY, 'replacement');
});

test('encryption and validation failures do not replace working credentials', async t => {
  const f = await fixture(t);
  const store = f.create();
  await store.save({ appId: '123', accessToken: 'first' });
  await assert.rejects(store.save({ appId: '', accessToken: 'bad' }), /有效/);
  f.safeStorage.isEncryptionAvailable = () => false;
  await assert.rejects(store.save({ appId: '123', accessToken: 'second' }), /加密不可用/);
  assert.equal(store.config().VOLCENGINE_ASR_ACCESS_KEY, 'first');
});

test('corrupt files surface errors and can be replaced by user input', async t => {
  const f = await fixture(t);
  await fs.writeFile(f.filePath, 'CREDENTIALS_ENCRYPTED=invalid');
  const store = f.create();
  assert.match((await store.initialize()).error, /重新输入/);
  await store.save({ appId: '123', accessToken: 'fixed' });
  assert.deepEqual(store.status(), { configured: true, error: '' });
});

test('disk failures do not apply unsaved credentials', async t => {
  const f = await fixture(t);
  const store = f.create();
  await store.save({ appId: '123', accessToken: 'first' });
  await fs.mkdir(`${f.filePath}.tmp`);
  await assert.rejects(store.save({ appId: '123', accessToken: 'second' }), /无法保存/);
  assert.equal(store.config().VOLCENGINE_ASR_ACCESS_KEY, 'first');
});
