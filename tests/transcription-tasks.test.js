const test = require('node:test');
const assert = require('node:assert/strict');
const { createTranscriptionTasks } = require('../electron/transcription-tasks');
const { pcmToWav } = require('../electron/media-decoder');

function fixture(overrides = {}) {
  const events = [];
  const files = { recordingPath: 'task/audio.wav', markdownPath: null };
  const wav = pcmToWav(Buffer.alloc(20));
  const tasks = createTranscriptionTasks({
    ensureConfigured() { events.push('configured'); },
    selectMedia: async () => 'source.mp4',
    decoder: { decode: async () => { events.push('decode'); return wav; }, dispose() {} },
    store: {
      saveAudio: async value => { events.push(`audio:${value.format}`); return files; },
      saveTranscript: async () => { events.push('text'); files.markdownPath = 'task/transcript.md'; }
    },
    transcribe: async value => { events.push('transcribe'); assert.deepEqual(value.buffer, wav); return { text: '转录' }; },
    onResult: () => events.push('result'),
    ...overrides
  });
  return { tasks, events, files, wav };
}

test('video import extracts audio, saves it, then transcribes and saves text', async () => {
  const x = fixture();
  const result = await x.tasks.importMedia({ directory: 'output' });
  assert.equal(result.text, '转录');
  assert.deepEqual(x.events, ['configured', 'decode', 'audio:wav', 'transcribe', 'text', 'result']);
});

test('recordings keep original WebM while WAV is sent for transcription', async () => {
  const x = fixture();
  const result = await x.tasks.processRecording({ directory: 'output', buffer: Buffer.from('webm'), wavBuffer: x.wav });
  assert.equal(result.text, '转录');
  assert.deepEqual(x.events, ['configured', 'audio:webm', 'transcribe', 'text', 'result']);
});

test('upstream failure returns the retained audio without claiming a transcript', async () => {
  const x = fixture({ transcribe: async () => { throw new Error('service 403'); } });
  const result = await x.tasks.importMedia({ directory: 'output' });
  assert.equal(result.error, 'service 403');
  assert.equal(result.files.markdownPath, null);
  assert.ok(!x.events.includes('text'));
});

test('cancel, decode failure and missing configuration never submit or save media', async () => {
  const x = fixture({ selectMedia: async () => null });
  assert.deepEqual(await x.tasks.importMedia({}), { canceled: true });
  assert.deepEqual(x.events, ['configured']);
  const y = fixture({ decoder: { decode: async () => { throw new Error('no audio'); } } });
  assert.equal((await y.tasks.importMedia({})).error, 'no audio');
  assert.deepEqual(y.events, ['configured']);
  const z = fixture({ ensureConfigured() { throw new Error('configure first'); } });
  assert.equal((await z.tasks.importMedia({})).error, 'configure first');
  assert.deepEqual(z.events, []);
});

test('concurrent jobs are blocked and closing prevents subsequent submission', async () => {
  let release;
  const x = fixture({ selectMedia: () => new Promise(resolve => { release = resolve; }) });
  const pending = x.tasks.importMedia({});
  assert.match((await x.tasks.processRecording({})).error, /已有任务/);
  x.tasks.dispose();
  release('source.mp4');
  assert.match((await pending).error, /正在退出/);
  assert.deepEqual(x.events, ['configured']);
});
