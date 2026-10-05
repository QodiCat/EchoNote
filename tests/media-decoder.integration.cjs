const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createMediaDecoder } = require('../electron/media-decoder');
const ffmpegPath = process.env.ECHONOTE_TEST_FFMPEG || path.join(__dirname, '..', 'vendor', 'ffmpeg', 'ffmpeg.exe');

test('real FFmpeg extracts audio/video, rejects silent video, and leaves sources intact', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'echonote-real-media-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const run = args => {
    const result = spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', ...args], {
      windowsHide: true, timeout: 15000, encoding: 'utf8'
    });
    assert.equal(result.status, 0, 'Unable to generate synthetic media fixture');
  };
  const audio = path.join(dir, '测试 音频.mp3');
  const video = path.join(dir, '测试 视频.mp4');
  const silent = path.join(dir, '无音轨.mp4');
  run(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.3', audio]);
  run(['-f', 'lavfi', '-i', 'color=c=black:s=16x16:d=0.3', '-i', audio,
    '-c:v', 'mpeg4', '-c:a', 'aac', '-shortest', video]);
  run(['-f', 'lavfi', '-i', 'color=c=black:s=16x16:d=0.3', '-an', '-c:v', 'mpeg4', silent]);
  const decoder = createMediaDecoder({ ffmpegPath, maxAudioBytes: 1024 * 1024,
    maxMediaBytes: 1024 * 1024, timeoutMs: 10000 });
  for (const input of [audio, video]) {
    const before = await fs.readFile(input);
    const wav = await decoder.decode(input);
    assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    assert.equal(wav.readUInt32LE(24), 16000);
    assert.equal(wav.readUInt16LE(22), 1);
    assert.equal(wav.readUInt32LE(40), wav.length - 44);
    assert.ok(wav.length > 4000);
    assert.deepEqual(await fs.readFile(input), before);
  }
  await assert.rejects(decoder.decode(silent), /没有音轨/);
  assert.equal((await fs.readdir(dir)).length, 3);
  decoder.dispose();
});
