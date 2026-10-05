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
        onTaskProgress() {},
        processRecording() { submissions++; return new Promise(resolve => { resolveTranscript = resolve; }); },
        saveRecording: async () => ({ markdownPath: 'test.md' })
      }
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/import-media.js'), 'utf8'), context);
  vm.runInContext('serviceReady = true', context);
  return { context, node, start: () => context.startRecording(), stop: () => context.stopRecording(),
    accept: () => resolveCapture(stream), reject: () => rejectCapture(new Error('capture failed')),
    finish: () => context.finishRecording(), complete: () => resolveTranscript({ files: { directory: 'test', recordingPath: 'test/audio.webm', markdownPath: 'test/transcript.md' }, text: 'test' }),
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

test('import blocks simultaneous recording and repeated imports then displays transcript', async () => {
  const x = setup();
  let calls = 0;
  let complete;
  x.context.window.echoNote.importMedia = () => { calls++; return new Promise(resolve => { complete = resolve; }); };
  const pending = x.context.importMedia();
  await x.context.importMedia();
  await x.start();
  assert.equal(calls, 1);
  assert.equal(x.counts().captures, 0);
  assert.equal(x.node('importButton').disabled, true);
  complete({ files: { directory: 'output/time', recordingPath: 'output/time/audio.wav', markdownPath: 'output/time/transcript.md' }, text: '导入文本' });
  await pending;
  assert.equal(x.node('transcriptPreview').textContent, '导入文本');
  assert.equal(x.node('resultDetail').textContent, 'output/time');
  assert.equal(x.node('recordButton').disabled, false);
  assert.equal(x.node('importButton').disabled, false);
});

test('import cancellation and failure recover controls and retain audio-only results', async () => {
  const x = setup();
  x.context.window.echoNote.importMedia = async () => ({ canceled: true });
  await x.context.importMedia();
  assert.equal(x.node('importButton').disabled, false);
  x.context.window.echoNote.importMedia = async () => ({ error: '转录失败', files: {
    recordingPath: 'output/time/audio.wav', directory: 'output/time', markdownPath: null
  } });
  await x.context.importMedia();
  assert.equal(x.node('resultTitle').textContent, '仅保存音频');
  assert.match(x.node('recordHint').textContent, /音频已保留/);
  assert.equal(x.node('importButton').disabled, false);
});

test('deleting a result blocks new recording and import until removal completes', async () => {
  const x = setup();
  let complete;
  x.context.window.confirm = () => true;
  x.context.window.echoNote.deleteRecording = () => new Promise(resolve => { complete = resolve; });
  x.context.window.echoNote.importMedia = () => assert.fail('import must wait for deletion');
  vm.runInContext("state.lastFiles = { recordingPath: 'audio.wav', markdownPath: 'text.md' }", x.context);
  const pending = x.context.deleteLast();
  await x.context.importMedia(); await x.start();
  assert.equal(x.counts().captures, 0);
  assert.equal(x.node('importButton').disabled, true);
  complete({ folderRetained: false }); await pending;
  assert.equal(x.node('importButton').disabled, false);
});
