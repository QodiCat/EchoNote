const test = require('node:test');
const assert = require('node:assert/strict');
const { encodeMonoWav, recordingToWav } = require('../src/audio-format');
const { transcribe } = require('../server/volcengine');

function wav() {
  return Buffer.from(encodeMonoWav({
    length: 4, numberOfChannels: 2, sampleRate: 16000,
    getChannelData: () => new Float32Array([-1, 0, 1, 2])
  }));
}

function configure(t) {
  for (const key of ['VOLCENGINE_ASR_APP_KEY', 'VOLCENGINE_ASR_ACCESS_KEY']) {
    const previous = process.env[key];
    process.env[key] = 'test-only';
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }
}

const input = () => ({ audio: wav(), contentType: 'audio/wav', includeTimestamps: true, requestId: 'test-request' });

test('encodes mono PCM16 WAV with correct header, size, and sample clipping', () => {
  const audio = wav();
  assert.equal(audio.toString('ascii', 0, 4), 'RIFF');
  assert.equal(audio.toString('ascii', 8, 12), 'WAVE');
  assert.equal(audio.readUInt32LE(4), audio.length - 8);
  assert.equal(audio.readUInt16LE(22), 1);
  assert.equal(audio.readUInt32LE(24), 16000);
  assert.equal(audio.readUInt16LE(34), 16);
  assert.equal(audio.readUInt32LE(40), 8);
  assert.deepEqual([44, 46, 48, 50].map(offset => audio.readInt16LE(offset)), [-32768, 0, 32767, 32767]);
});

test('converts decoded audio without detaching the original recording', async t => {
  const originalContext = global.OfflineAudioContext;
  t.after(() => {
    if (originalContext === undefined) delete global.OfflineAudioContext;
    else global.OfflineAudioContext = originalContext;
  });
  const original = new Uint8Array([1, 2, 3]).buffer;
  global.OfflineAudioContext = class {
    constructor(channels, length, rate) { assert.equal(rate, 16000); }
    async decodeAudioData(copy) {
      assert.notEqual(copy, original);
      structuredClone(copy, { transfer: [copy] });
      return { length: 1, numberOfChannels: 1, sampleRate: 16000, getChannelData: () => new Float32Array([0]) };
    }
  };
  assert.equal((await recordingToWav(original)).byteLength, 46);
  assert.equal(original.byteLength, 3);
});

test('submits JSON with base64 WAV and returns real result and utterances', async t => {
  configure(t);
  const result = await transcribe(input(), async (_url, options) => {
    assert.equal(options.headers['Content-Type'], 'application/json');
    const body = JSON.parse(options.body);
    assert.deepEqual(Buffer.from(body.audio.data, 'base64'), wav());
    assert.equal(body.request.model_name, 'bigmodel');
    assert.equal(body.request.enable_punc, true);
    assert.equal(body.request.show_utterances, true);
    return new Response(JSON.stringify({ result: { text: '测试。', utterances: [{ text: '测试。', start_time: 0, end_time: 500 }] } }), {
      headers: { 'x-api-status-code': '20000000' }
    });
  });
  assert.equal(result.text, '测试。');
  assert.equal(result.timestamps.length, 1);
});

test('reports HTTP failure without exposing upstream response or headers', async t => {
  configure(t);
  await assert.rejects(transcribe(input(), async () => new Response('sensitive upstream body', {
    status: 403, headers: { 'x-api-message': 'sensitive header', 'x-api-status-code': '45000001' }
  })), error => {
    assert.match(error.publicMessage, /HTTP 403/);
    assert.match(error.publicMessage, /45000001/);
    assert.doesNotMatch(error.publicMessage, /sensitive/);
    return true;
  });
});

test('does not treat HTTP 200 with a failed service code as success', async t => {
  configure(t);
  await assert.rejects(transcribe(input(), async () => new Response('{}', {
    headers: { 'x-api-status-code': '20000003' }
  })), /upstream request rejected/);
});

test('rejects WebM mislabeled as WAV before sending data', async t => {
  configure(t);
  await assert.rejects(transcribe({ ...input(), audio: Buffer.alloc(44) }, async () => {
    assert.fail('Invalid audio must not be transmitted');
  }), error => error.code === 'invalid_audio_format');
});

test('requires a success service code and valid JSON with transcription text', async t => {
  configure(t);
  await assert.rejects(transcribe(input(), async () => new Response('{}')), /upstream request rejected/);
  await assert.rejects(transcribe(input(), async () => new Response('invalid', {
    headers: { 'x-api-status-code': '20000000' }
  })), error => error.code === 'invalid_upstream_json');
  await assert.rejects(transcribe(input(), async () => new Response('{}', {
    headers: { 'x-api-status-code': '20000000' }
  })), error => error.code === 'invalid_upstream_response');
});
