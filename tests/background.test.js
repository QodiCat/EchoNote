const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createBackground } = require('../electron/background');

function setup() {
  const app = new EventEmitter();
  const window = new EventEmitter();
  let prevented = false;
  let minimized = false;
  let destroyed = false;
  const calls = [];
  window.isDestroyed = () => destroyed;
  window.isMinimized = () => minimized;
  for (const name of ['hide', 'restore', 'show', 'focus']) window[name] = () => calls.push(name);
  const close = () => { prevented = false; window.emit('close', { preventDefault() { prevented = true; } }); return prevented; };
  app.quit = () => { app.emit('before-quit'); close(); };
  let tray;
  class Tray extends EventEmitter {
    constructor() { super(); tray = this; }
    setToolTip() {}
    setContextMenu(menu) { this.menu = menu; }
    destroy() { calls.push('destroyTray'); }
  }
  const background = createBackground({ app, window, Tray,
    Menu: { buildFromTemplate: items => items }, nativeImage: { createFromBitmap: () => ({}) } });
  return { app, window, tray, calls, close, background, prevented: () => prevented,
    minimize: () => { minimized = true; }, destroy: () => { destroyed = true; } };
}

test('closing the window hides it without destroying the recording renderer', () => {
  const x = setup();
  assert.equal(x.close(), true);
  assert.equal(x.close(), true);
  assert.deepEqual(x.calls, ['hide', 'hide']);
});

test('tray click, show menu and app activation restore and focus the window', () => {
  const x = setup();
  x.minimize();
  x.tray.emit('click');
  x.tray.menu[0].click();
  x.app.emit('activate');
  assert.deepEqual(x.calls, Array(3).fill(['restore', 'show', 'focus']).flat());
  x.destroy();
  x.tray.emit('click');
  assert.equal(x.calls.length, 9);
});

test('explicit quit permits window closure and cleanup releases tray and handlers', () => {
  const x = setup();
  x.tray.menu[2].click();
  assert.equal(x.prevented(), false);
  assert.deepEqual(x.calls, []);
  x.background.dispose();
  assert.deepEqual(x.calls, ['destroyTray']);
  assert.equal(x.window.listenerCount('close'), 0);
  assert.equal(x.app.listenerCount('activate'), 0);
  assert.equal(x.app.listenerCount('before-quit'), 0);
});
