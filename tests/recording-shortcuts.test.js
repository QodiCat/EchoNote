const test = require('node:test');
const assert = require('node:assert/strict');
const { createRecordingDispatcher } = require('../electron/recording-shortcuts');

test('recording shortcuts dispatch commands with a user gesture and surface failures', async () => {
  const calls = [];
  let failure;
  const window = {
    isDestroyed: () => false,
    isMinimized: () => true,
    restore: () => calls.push('restore'),
    show: () => calls.push('show'),
    focus: () => calls.push('focus'),
    webContents: {
      isLoading: () => false,
      executeJavaScript: async (script, gesture) => calls.push([script, gesture]),
    },
  };
  const dispatch = createRecordingDispatcher({
    getWindow: () => window,
    onError: (e) => {
      failure = e;
    },
  });
  await dispatch('start');
  assert.deepEqual(calls, [
    'restore',
    'show',
    'focus',
    ['window.echoNoteActions.startRecording()', true],
  ]);
  await dispatch('stop');
  assert.deepEqual(calls.at(-1), ['window.echoNoteActions.stopRecording()', true]);
  window.webContents.executeJavaScript = async () => {
    throw new Error('renderer unavailable');
  };
  await dispatch('start');
  assert.match(failure.message, /renderer unavailable/);
  window.webContents.isLoading = () => true;
  const count = calls.length;
  await dispatch('start');
  assert.equal(calls.length, count);
});
