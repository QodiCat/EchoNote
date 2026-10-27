const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { verifyMedia } = require('../scripts/media-integrity');

test('media verification rejects a replaced binary even with a matching generated manifest', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'echonote-integrity-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'ffmpeg.exe'), 'untrusted replacement');
  assert.throws(() => verifyMedia(root), /锁定版本/);
});
