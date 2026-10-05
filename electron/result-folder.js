const fs = require('node:fs/promises');
const path = require('node:path');

async function openResultFolder(markdownPath, { openPath, stat = fs.stat }) {
  if (!markdownPath) return { error: '暂无已保存的转录结果' };
  const directory = path.dirname(markdownPath);
  try {
    if (!(await stat(directory)).isDirectory()) return { error: '转录文件夹不存在或已被移动' };
    const error = await openPath(directory);
    if (error) return { error: '无法打开转录文件夹，请检查目录权限' };
    return { opened: true };
  } catch (error) {
    return { error: error.code === 'ENOENT'
      ? '转录文件夹不存在或已被移动' : '无法打开转录文件夹，请检查目录权限' };
  }
}

module.exports = { openResultFolder };
