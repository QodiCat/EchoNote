const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const lock = require('../config/media-lock.json');

function verifyMedia(root, binaryDirectory = '') {
  for (const [name, expected] of Object.entries(lock.files)) {
    const file = path.join(root, name === 'ffmpeg.exe' ? binaryDirectory : '', name);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (hash !== expected) throw new Error(`媒体组件 ${name} 与仓库锁定版本不一致`);
  }
  return lock;
}
module.exports = { verifyMedia };
