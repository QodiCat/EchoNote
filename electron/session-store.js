const fs = require('node:fs/promises');
const path = require('node:path');

function timestampName(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('任务时间无效');
  const pad = (n, width = 2) => String(n).padStart(width, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${pad(date.getMilliseconds(), 3)}`;
}

function createSessionStore({ io = fs } = {}) {
  const sessions = new WeakSet();
  async function saveAudio({ directory, buffer, format, startedAt = Date.now() }) {
    if (typeof directory !== 'string' || !path.isAbsolute(directory)) throw new Error('请先选择有效的保存目录');
    if (!['wav', 'webm'].includes(format)) throw new Error('保存音频格式无效');
    const audio = Buffer.from(buffer);
    if (!audio.length) throw new Error('音频内容为空');
    const name = timestampName(startedAt);
    await io.mkdir(directory, { recursive: true });
    let sessionDirectory;
    for (let suffix = 0; suffix < 1000; suffix++) {
      sessionDirectory = path.join(directory, `${name}${suffix ? `_${String(suffix).padStart(3, '0')}` : ''}`);
      try { await io.mkdir(sessionDirectory); break; }
      catch (error) {
        if (error.code !== 'EEXIST' || suffix === 999) throw new Error('无法创建本次任务文件夹，请检查目录权限');
      }
    }
    const recordingPath = path.join(sessionDirectory, `audio.${format}`);
    try { await io.writeFile(recordingPath, audio, { flag: 'wx' }); }
    catch { throw new Error(`音频保存失败，请检查磁盘空间和目录权限：${sessionDirectory}`); }
    const result = { directory: sessionDirectory, recordingPath, markdownPath: null };
    sessions.add(result);
    return result;
  }
  async function saveTranscript(result, text, includeTimestamps) {
    if (!sessions.has(result)) throw new Error('任务不存在');
    if (typeof text !== 'string') throw new Error('转录结果格式无效');
    const markdownPath = path.join(result.directory, 'transcript.md');
    const markdown = includeTimestamps ? `[${new Date().toLocaleTimeString()}] ${text}\n` : `${text}\n`;
    try { await io.writeFile(markdownPath, markdown, { flag: 'wx' }); }
    catch { throw new Error('文本保存失败，音频已保留，请检查磁盘空间和目录权限'); }
    result.markdownPath = markdownPath;
    return result;
  }
  async function deleteResult(result) {
    if (!sessions.has(result)) throw new Error('没有可删除的本次运行结果');
    // Only application-created files are removed; imported source files are never stored here.
    await io.rm(result.recordingPath, { force: true });
    if (result.markdownPath) await io.rm(result.markdownPath, { force: true });
    let folderRetained = false;
    try { await io.rmdir(result.directory); }
    catch (error) {
      if (error.code === 'ENOTEMPTY' || error.code === 'EEXIST') folderRetained = true;
      else if (error.code !== 'ENOENT') throw error;
    }
    sessions.delete(result);
    return { deleted: true, folderRetained };
  }
  return { saveAudio, saveTranscript, deleteResult };
}

module.exports = { createSessionStore, timestampName };
