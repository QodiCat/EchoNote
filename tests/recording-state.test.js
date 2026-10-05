const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function setup() {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { disabled: false, checked: false, classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {} });
    return nodes.get(id);
  };
  let resolveCapture;
  let rejectCapture;
  let captures = 0;
  let stops = 0;
  let released = 0;
  let submissions = 0;
  let resolveTranscript;
  const track = { stop() { released++; } };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track], getVideoTracks: () => [] };
  class Recorder {
    constructor(audio) { this.stream = audio; this.state = 'inactive'; }
    start() { this.state = 'recording'; }
    stop() { stops++; this.state = 'inactive'; }
  }
  const context = vm.createContext({
    document: { getElementById: node, querySelector: node },
    localStorage: { getItem: () => 'test-directory', setItem() {} },
    navigator: { mediaDevices: { getDisplayMedia() { captures++; return new Promise((resolve, reject) => { resolveCapture = resolve; rejectCapture = reject; }); } } },
    MediaStream: class { getTracks() { return [track]; } }, MediaRecorder: Recorder,
    Blob, Date,
    recordingToWav: async buffer => buffer,
    window: {
      clearTimeout() {}, setTimeout() {}, clearInterval() {}, setInterval() {},
      echoNote: {
        transcribeRecording() { submissions++; return new Promise(resolve => { resolveTranscript = resolve; }); },
        saveRecording: async () => ({ markdownPath: 'test.md' })
      }
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8'), context);
  vm.runInContext('serviceReady = true', context);
  return { context, node, start: () => context.startRecording(), stop: () => context.stopRecording(),
    accept: () => resolveCapture(stream), reject: () => rejectCapture(new Error('capture failed')),
    finish: () => context.finishRecording(), complete: () => resolveTranscript({ text: 'test' }),
    counts: () => ({ captures, stops, released, submissions }) };
}

test('repeated start/stop and start during transcription do not create extra tasks', { timeout: 2000 }, async () => {
  const x = setup();
  const pending = x.start();
  await x.start();
  assert.equal(x.counts().captures, 1);
  x.accept(); await pending;
  await x.start();
  x.stop(); x.stop();
  await x.start();
  assert.equal(x.counts().stops, 1);
  assert.equal(x.counts().captures, 1);
  const finished = x.finish();
  await new Promise(resolve => setImmediate(resolve));
  await x.start();
  assert.equal(x.counts().submissions, 1);
  assert.equal(x.counts().released, 1);
  x.complete(); await finished;
  const next = x.start();
  assert.equal(x.counts().captures, 2);
  x.reject(); await next;
});

test('capture failure returns to idle and allows a fresh attempt', async () => {
  const x = setup();
  const first = x.start(); x.reject(); await first;
  assert.equal(x.node('recordButton').disabled, false);
  const second = x.start(); x.accept(); await second;
  assert.equal(x.counts().captures, 2);
  x.stop();
  assert.equal(x.counts().stops, 1);
});

test('unconfigured transcription prevents recording before audio capture', async () => {
  const x = setup();
  vm.runInContext('serviceReady = false', x.context);
  await x.start();
  assert.equal(x.counts().captures, 0);
});

test('opening a result folder guards missing results and restores the button after errors', async () => {
  const x = setup();
  let calls = 0;
  x.context.window.echoNote.openResultFolder = async () => { calls++; return { error: '文件夹已移动' }; };
  await x.context.openLastFolder();
  assert.equal(calls, 0);
  vm.runInContext("state.lastFiles = { markdownPath: 'saved/record.md' }; state.directory = 'new-directory'", x.context);
  await x.context.openLastFolder();
  assert.equal(calls, 1);
  assert.equal(x.node('toast').textContent, '文件夹已移动');
  assert.equal(x.node('openResultFolder').disabled, false);
  x.context.window.echoNote.openResultFolder = async () => { throw new Error('IPC failed'); };
  await x.context.openLastFolder();
  assert.match(x.node('toast').textContent, /无法打开/);
  assert.equal(x.node('openResultFolder').disabled, false);
});
