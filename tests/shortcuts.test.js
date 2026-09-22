const test = require('node:test');
const assert = require('node:assert/strict');
const { createShortcuts, validate } = require('../electron/shortcuts');

function setup() {
  const handlers = new Map();
  const blocked = new Set();
  const actions = [];
  const files = new Map();
  const storage = {
    async readFile(file) { if (!files.has(file)) throw Object.assign(new Error(), { code: 'ENOENT' }); return files.get(file); },
    async writeFile(file, text) { files.set(file, text); },
    async rename(from, to) { files.set(to, files.get(from)); files.delete(from); }
  };
  const registry = {
    register(key, callback) { if (blocked.has(key)) return false; handlers.set(key, callback); return true; },
    unregister(key) { handlers.delete(key); }
  };
  const create = () => createShortcuts({ registry, storage, filePath: 'shortcuts.json', dispatch: action => actions.push(action) });
  return { manager: create(), create, handlers, blocked, actions, files, storage };
}

test('normalizes shortcuts and rejects equivalent duplicates and unsafe formats', () => {
  assert.deepEqual(validate({ start: 'alt + ctrl + r', stop: '' }), { start: 'Ctrl+Alt+R', stop: '' });
  assert.throws(() => validate({ start: 'Ctrl+Alt+R', stop: 'alt+ctrl+r' }), /相同/);
  for (const start of ['R', 'Shift+R', 'Ctrl+Ctrl+R', 'Ctrl+F25', 'Ctrl+Enter', 10]) {
    assert.throws(() => validate({ start, stop: '' }));
  }
});

test('saves, triggers actions, swaps keys, disables, and restores after restart', async () => {
  const x = setup();
  await x.manager.update({ start: 'Ctrl+Alt+R', stop: 'Ctrl+Alt+S' });
  x.handlers.get('Ctrl+Alt+R')();
  assert.deepEqual(x.actions, ['start']);
  await x.manager.update({ start: 'Ctrl+Alt+S', stop: 'Ctrl+Alt+R' });
  x.handlers.get('Ctrl+Alt+R')();
  assert.deepEqual(x.actions, ['start', 'stop']);
  x.manager.dispose();
  assert.equal(x.handlers.size, 0);
  const restarted = x.create();
  await restarted.initialize();
  assert.equal(restarted.get().settings.start, 'Ctrl+Alt+S');
  await restarted.update({ start: '', stop: '' });
  assert.equal(x.handlers.size, 0);
});

test('registration conflict rolls back new keys and retains old settings', async () => {
  const x = setup();
  await x.manager.update({ start: 'Ctrl+R', stop: 'Ctrl+S' });
  x.blocked.add('Alt+S');
  await assert.rejects(x.manager.update({ start: 'Alt+R', stop: 'Alt+S' }), /占用/);
  assert.deepEqual([...x.handlers.keys()], ['Ctrl+R', 'Ctrl+S']);
  assert.equal(x.manager.get().settings.start, 'Ctrl+R');
  assert.equal(JSON.parse(x.files.get('shortcuts.json')).start, 'Ctrl+R');
});

test('disk failure retains old active shortcuts and saved settings', async () => {
  const x = setup();
  await x.manager.update({ start: 'Ctrl+R', stop: '' });
  x.storage.rename = async () => { throw new Error('disk failure'); };
  await assert.rejects(x.manager.update({ start: 'Alt+R', stop: '' }), /无法保存/);
  assert.deepEqual([...x.handlers.keys()], ['Ctrl+R']);
  assert.equal(JSON.parse(x.files.get('shortcuts.json')).start, 'Ctrl+R');
});

test('startup reports conflict or corrupt settings and keeps recording shortcuts disabled', async () => {
  const x = setup();
  await x.manager.initialize();
  assert.equal(x.manager.get().error, '');
  x.files.set('shortcuts.json', 'invalid');
  await x.manager.initialize();
  assert.match(x.manager.get().error, /配置文件格式错误/);
  x.files.set('shortcuts.json', JSON.stringify({ start: 'Ctrl+R', stop: 'Ctrl+S' }));
  x.blocked.add('Ctrl+S');
  await x.manager.initialize();
  assert.match(x.manager.get().error, /占用/);
  assert.equal(x.handlers.size, 0);
});
