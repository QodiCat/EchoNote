const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { openResultFolder } = require('../electron/result-folder');

test('opens the saved result directory, including spaces and Chinese characters', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'echonote-转录 结果-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const opened = [];
  const result = await openResultFolder(path.join(directory, 'record.md'), {
    openPath: async value => { opened.push(value); return ''; }
  });
  assert.deepEqual(result, { opened: true });
  assert.deepEqual(opened, [directory]);
});

test('missing results and moved folders show errors without opening anything', async () => {
  const openPath = async () => assert.fail('must not open a missing directory');
  assert.match((await openResultFolder(null, { openPath })).error, /暂无/);
  const result = await openResultFolder(path.join(os.tmpdir(), 'moved', 'record.md'), {
    openPath, stat: async () => { throw Object.assign(new Error('missing'), { code: 'ENOENT' }); }
  });
  assert.match(result.error, /不存在或已被移动/);
});

test('shell failures and access errors are visible, never reported as success', async () => {
  const markdown = path.join(os.tmpdir(), 'record.md');
  const stat = async () => ({ isDirectory: () => true });
  assert.match((await openResultFolder(markdown, { stat, openPath: async () => 'OS error' })).error, /无法打开/);
  assert.match((await openResultFolder(markdown, {
    stat, openPath: async () => { throw new Error('access denied'); }
  })).error, /无法打开/);
});
