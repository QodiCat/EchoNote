const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { createMediaDecoder, pcmToWav } = require('../electron/media-decoder');

async function fixture(t, action, overrides = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'echonote-media-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, '测试 空格.mp4');
  await fs.writeFile(file, 'synthetic input');
  let killed = 0;
  const decoder = createMediaDecoder({ ffmpegPath: 'test-only', maxAudioBytes: 1000,
    maxMediaBytes: 1000, timeoutMs: 1000, spawnImpl: (_bin, args, options) => {
      assert.equal(options.shell, false);
      assert.equal(options.windowsHide, true);
      assert.equal(args[args.indexOf('-i') + 1], file);
      assert.equal(args[args.indexOf('-map') + 1], '0:a:0');
      const child = new EventEmitter();
      child.stdout = new PassThrough(); child.stderr = new PassThrough();
      child.kill = () => { killed++; setImmediate(() => child.emit('close', 1)); };
      setImmediate(() => action(child));
      return child;
    }, ...overrides });
  return { decoder, file, killed: () => killed };
}

test('PCM conversion produces a complete mono 16k WAV with exact sizes', () => {
  const pcm = Buffer.from([0, 0, 255, 127]);
  const wav = pcmToWav(pcm);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.readUInt32LE(4), 40);
  assert.equal(wav.readUInt32LE(40), 4);
  assert.equal(wav.readUInt32LE(24), 16000);
  assert.equal(wav.readUInt16LE(22), 1);
  assert.deepEqual(wav.subarray(44), pcm);
  assert.throws(() => pcmToWav(Buffer.alloc(0)), /没有可转录/);
});

test('extracts only audio and returns WAV without altering the original file', async t => {
  const f = await fixture(t, child => { child.stdout.write(Buffer.alloc(20)); child.emit('close', 0); });
  assert.equal((await f.decoder.decode(f.file)).length, 64);
  assert.equal(await fs.readFile(f.file, 'utf8'), 'synthetic input');
  assert.deepEqual(await fs.readdir(path.dirname(f.file)), [path.basename(f.file)]);
});

test('no audio, corrupt input and startup failures are visible and do not leak stderr', async t => {
  for (const [diagnostic, expected] of [['Stream map matches no streams', /没有音轨/], ['private file detail', /损坏/]]) {
    const f = await fixture(t, child => { child.stderr.write(diagnostic); child.emit('close', 1); });
    await assert.rejects(f.decoder.decode(f.file), expected);
  }
  const f = await fixture(t, child => { child.emit('error', new Error('private')); child.emit('close', -1); });
  await assert.rejects(f.decoder.decode(f.file), /无法启动/);
});

test('decoded audio limits abort extraction instead of submitting a truncated result', async t => {
  const f = await fixture(t, child => child.stdout.write(Buffer.alloc(1000)));
  await assert.rejects(f.decoder.decode(f.file), /超过转录大小限制/);
  assert.equal(f.killed(), 1);
});

test('timeout and app exit stop the extraction process', async t => {
  const f = await fixture(t, () => {}, { timeoutMs: 50 });
  await assert.rejects(f.decoder.decode(f.file), /超时/);
  assert.equal(f.killed(), 1);
  const g = await fixture(t, () => g.decoder.dispose());
  await assert.rejects(g.decoder.decode(g.file), /正在退出/);
  assert.equal(g.killed(), 1);
  await assert.rejects(g.decoder.decode(g.file), /正在退出/);
});
