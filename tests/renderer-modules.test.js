const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('renderer modules can register in any order without leaking application globals', () => {
  const context = vm.createContext({ window: {} });
  for (const file of ['service-settings', 'settings', 'import-media', 'renderer', 'audio-format']) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, '..', 'src', `${file}.js`), 'utf8'),
      context,
    );
  }
  assert.equal(typeof context.window.EchoNoteModules.createRenderer, 'function');
  assert.equal(typeof context.window.EchoNoteModules.initializeImport, 'function');
  assert.equal(typeof context.window.EchoNoteModules.audioFormat.recordingToWav, 'function');
  assert.equal(vm.runInContext('typeof state', context), 'undefined');
  assert.equal(vm.runInContext('typeof serviceReady', context), 'undefined');
  assert.equal(vm.runInContext('typeof $', context), 'undefined');
});
