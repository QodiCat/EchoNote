const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createSessionStore, timestampName } = require('../electron/session-store');

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'echonote-sessions-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

test('timestamps use local date/time with milliseconds', () => {
  assert.equal(timestampName(new Date(2026, 9, 5, 14, 3, 9, 7)), '2026-10-05_14-03-09-007');
  assert.throws(() => timestampName('invalid'), /时间无效/);
});

test('every task gets a new directory even with identical timestamps', async t => {
  const directory = await fixture(t);
  const store = createSessionStore();
  const input = { directory, buffer: Buffer.from('audio'), format: 'wav', startedAt: 1234567890 };
  const [one, two] = await Promise.all([store.saveAudio(input), store.saveAudio(input)]);
  assert.notEqual(one.directory, two.directory);
  assert.equal(path.dirname(one.recordingPath), one.directory);
  await store.saveTranscript(one, '转录文本', false);
  assert.equal(path.dirname(one.markdownPath), one.directory);
  assert.equal(await fs.readFile(one.markdownPath, 'utf8'), '转录文本\n');
  assert.equal(await fs.readFile(two.recordingPath, 'utf8'), 'audio');
});

test('deleting a result never removes the imported source or other user files', async t => {
  const directory = await fixture(t);
  const source = path.join(directory, 'source.mp4');
  await fs.writeFile(source, 'original');
  const store = createSessionStore();
  const result = await store.saveAudio({ directory, buffer: Buffer.from('wav'), format: 'wav' });
  await store.saveTranscript(result, 'text', false);
  await fs.writeFile(path.join(result.directory, 'user.txt'), 'keep');
  assert.equal((await store.deleteResult(result)).folderRetained, true);
  assert.equal(await fs.readFile(source, 'utf8'), 'original');
  assert.deepEqual(await fs.readdir(result.directory), ['user.txt']);
  await assert.rejects(store.deleteResult({ recordingPath: source }), /不存在|没有可删除/);
});

test('audio-only results can be removed along with their empty task directory', async t => {
  const directory = await fixture(t);
  const store = createSessionStore();
  const result = await store.saveAudio({ directory, buffer: Buffer.from('webm'), format: 'webm' });
  assert.deepEqual(await store.deleteResult(result), { deleted: true, folderRetained: false });
  assert.deepEqual(await fs.readdir(directory), []);
});

test('text write failure keeps the saved audio and reports the failure', async t => {
  const directory = await fixture(t);
  const store = createSessionStore({ io: { ...fs, writeFile: async (file, ...args) => {
    if (file.endsWith('.md')) throw new Error('disk full');
    return fs.writeFile(file, ...args);
  } } });
  const result = await store.saveAudio({ directory, buffer: Buffer.from('audio'), format: 'wav' });
  await assert.rejects(store.saveTranscript(result, 'text', false), /文本保存失败/);
  assert.equal(result.markdownPath, null);
  assert.equal(await fs.readFile(result.recordingPath, 'utf8'), 'audio');
});
