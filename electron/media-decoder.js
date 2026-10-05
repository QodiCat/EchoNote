const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');

const extensions = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus', 'wma', 'mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v'];

function pcmToWav(pcm) {
  if (!pcm.length || pcm.length % 2) throw new Error('文件没有可转录的音频');
  const result = Buffer.alloc(44 + pcm.length);
  result.write('RIFF', 0); result.writeUInt32LE(result.length - 8, 4);
  result.write('WAVEfmt ', 8); result.writeUInt32LE(16, 16);
  result.writeUInt16LE(1, 20); result.writeUInt16LE(1, 22);
  result.writeUInt32LE(16000, 24); result.writeUInt32LE(32000, 28);
  result.writeUInt16LE(2, 32); result.writeUInt16LE(16, 34);
  result.write('data', 36); result.writeUInt32LE(pcm.length, 40);
  pcm.copy(result, 44);
  return result;
}

function createMediaDecoder({ ffmpegPath, maxAudioBytes, maxMediaBytes, timeoutMs, spawnImpl = spawn }) {
  for (const value of [maxAudioBytes, maxMediaBytes, timeoutMs]) {
    if (!Number.isSafeInteger(value) || value <= 44) throw new Error('媒体导入限制配置无效');
  }
  let active = null;
  let disposed = false;
  async function decode(filePath) {
    if (disposed) throw new Error('应用正在退出');
    if (active) throw new Error('已有文件正在提取音频');
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath) ||
      !extensions.includes(path.extname(filePath).slice(1).toLowerCase())) throw new Error('请选择支持的本地音频或视频文件');
    let info;
    try { info = await fs.stat(filePath); }
    catch { throw new Error('无法读取文件，请检查文件是否存在及访问权限'); }
    if (!info.isFile() || !info.size) throw new Error('请选择非空的音频或视频文件');
    if (info.size > maxMediaBytes) throw new Error('文件超过导入大小限制，请先分割文件');
    if (disposed) throw new Error('应用正在退出');
    if (active) throw new Error('已有文件正在提取音频');
    return new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      let stderr = '';
      let failure = '';
      let child;
      try {
        child = spawnImpl(ffmpegPath, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-xerror',
          '-protocol_whitelist', 'file,pipe', '-i', filePath, '-map', '0:a:0',
          '-vn', '-sn', '-dn', '-ac', '1', '-ar', '16000', '-acodec', 'pcm_s16le', '-f', 's16le', 'pipe:1'],
        { windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
      } catch { reject(new Error('无法启动音频提取组件，请重新安装应用')); return; }
      const stop = message => {
        if (!failure) failure = message;
        chunks.length = 0;
        child.kill();
      };
      active = { stop };
      const timer = setTimeout(() => stop('音频提取超时，请分割文件后重试'), timeoutMs);
      child.stdout.on('data', chunk => {
        if (failure) return;
        size += chunk.length;
        if (size + 44 > maxAudioBytes) { stop('提取的音频超过转录大小限制，请分割文件后重试'); return; }
        chunks.push(chunk);
      });
      child.stderr.on('data', chunk => { if (stderr.length < 8192) stderr += chunk.toString().slice(0, 8192 - stderr.length); });
      child.stdout.on('error', () => stop('无法读取提取出的音频'));
      child.stderr.on('error', () => stop('音频提取组件通信失败'));
      child.on('error', () => { failure = '无法启动音频提取组件，请重新安装应用'; });
      child.on('close', code => {
        clearTimeout(timer);
        active = null;
        if (failure) { reject(new Error(failure)); return; }
        if (code !== 0) {
          reject(new Error(/matches no streams|does not contain any stream/i.test(stderr)
            ? '文件中没有音轨，无法转录' : '音频提取失败，文件可能损坏或编码不受支持'));
          return;
        }
        try { resolve(pcmToWav(Buffer.concat(chunks, size))); }
        catch (error) { reject(error); }
      });
    });
  }
  function dispose() { disposed = true; active?.stop('应用正在退出，已停止音频提取'); }
  return { decode, dispose };
}

module.exports = { createMediaDecoder, extensions, pcmToWav };
