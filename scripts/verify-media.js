const fs = require('node:fs');
const path = require('node:path');
const { verifyMedia } = require('./media-integrity');
try {
  const root = path.join(__dirname, '..', 'vendor', 'ffmpeg');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const lock = verifyMedia(root);
  if (manifest.sha256 !== lock.files['ffmpeg.exe'] || manifest.version !== lock.version)
    throw new Error('媒体组件清单与锁定版本不一致');
  console.log(`媒体组件校验通过：${manifest.version}`);
} catch (error) {
  console.error(`无法打包媒体组件，请先运行 npm run media:prepare。${error.message}`);
  process.exitCode = 1;
}
