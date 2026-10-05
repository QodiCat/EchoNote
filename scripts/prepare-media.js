const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

async function main() {
  const source = process.argv[2];
  if (!source) throw new Error('用法：npm run media:prepare -- <FFmpeg 解压目录（含 bin/ffmpeg.exe、LICENSE、README.txt）>');
  const root = path.resolve(source);
  const destination = path.join(__dirname, '..', 'vendor', 'ffmpeg');
  const binary = await fs.readFile(path.join(root, 'bin', 'ffmpeg.exe'));
  const license = await fs.readFile(path.join(root, 'LICENSE'));
  const readme = await fs.readFile(path.join(root, 'README.txt'));
  const version = spawnSync(path.join(root, 'bin', 'ffmpeg.exe'), ['-version'], {
    windowsHide: true, timeout: 10000, encoding: 'utf8'
  });
  if (version.status !== 0) throw new Error('FFmpeg 无法运行，请检查来源目录');
  await fs.mkdir(destination, { recursive: true });
  await fs.writeFile(path.join(destination, 'ffmpeg.exe'), binary);
  await fs.writeFile(path.join(destination, 'LICENSE'), license);
  await fs.writeFile(path.join(destination, 'README.txt'), readme);
  await fs.writeFile(path.join(destination, 'manifest.json'), JSON.stringify({
    version: version.stdout.split(/\r?\n/)[0], sha256: crypto.createHash('sha256').update(binary).digest('hex')
  }, null, 2));
  console.log('媒体组件及许可证已准备；运行 npm run test:media 验证。');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
