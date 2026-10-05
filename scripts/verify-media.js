const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
try {
  const root = path.join(__dirname, '..', 'vendor', 'ffmpeg');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'ffmpeg.exe'))).digest('hex');
  if (hash !== manifest.sha256) throw new Error('媒体组件校验失败');
  for (const name of ['LICENSE', 'README.txt']) fs.accessSync(path.join(root, name));
  console.log(`媒体组件校验通过：${manifest.version}`);
} catch (error) { console.error(`无法打包媒体组件，请先运行 npm run media:prepare。${error.message}`); process.exitCode = 1; }
