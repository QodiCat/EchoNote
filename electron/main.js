const { app, BrowserWindow, dialog, ipcMain, session, desktopCapturer, globalShortcut } = require('electron');
const { createShortcuts } = require('./shortcuts');
const { createDisplayMediaHandler } = require('./display-media');
const fs = require('node:fs/promises');
const path = require('node:path');
const { loadEnv } = require('../config/env');

if (!app.isPackaged) {
  loadEnv(path.join(__dirname, '..', '.env'), ['ECHONOTE_PROXY_URL']);
}

let mainWindow;
let shortcuts;

async function runRecordingShortcut(action) {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isLoading()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  const script = action === 'start'
    ? "if (!document.getElementById('settingsDialog').open) document.getElementById('recordButton').click();"
    : "document.getElementById('stopButton').click();";
  try {
    // This invocation originates from a real user keyboard gesture.
    await mainWindow.webContents.executeJavaScript(script, true);
  } catch {
    dialog.showErrorBox('快捷键操作失败', '无法执行录音操作，请返回主界面重试。');
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#f7f8fa',
    title: 'EchoNote',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  session.defaultSession.setDisplayMediaRequestHandler(createDisplayMediaHandler(desktopCapturer));

  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
}

app.whenReady().then(async () => {
  shortcuts = createShortcuts({ registry: globalShortcut, filePath: path.join(app.getPath('userData'), 'shortcuts.json'), dispatch: runRecordingShortcut });
  await shortcuts.initialize();
  ipcMain.handle('get-shortcuts', () => shortcuts.get());
  ipcMain.handle('save-shortcuts', async (_event, settings) => {
    try { return { settings: await shortcuts.update(settings) }; }
    catch (error) { return { error: error.message }; }
  });
  ipcMain.handle('select-output-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: '选择 EchoNote 保存目录'
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('save-recording', async (_event, { directory, buffer, baseName, transcript, includeTimestamps }) => {
    if (!directory) throw new Error('请先配置保存目录');
    await fs.mkdir(directory, { recursive: true });
    const recordingPath = path.join(directory, `${baseName}.webm`);
    const markdownPath = path.join(directory, `${baseName}.md`);
    await fs.writeFile(recordingPath, Buffer.from(buffer));
    const markdown = includeTimestamps ? `[${new Date().toLocaleTimeString()}] ${transcript}\n` : `${transcript}\n`;
    await fs.writeFile(markdownPath, markdown, 'utf8');
    return { recordingPath, markdownPath };
  });

  ipcMain.handle('delete-recording', async (_event, { recordingPath, markdownPath }) => {
    await Promise.all([fs.rm(recordingPath, { force: false }), fs.rm(markdownPath, { force: false })]);
    return true;
  });

  ipcMain.handle('get-proxy-status', () => ({ configured: Boolean(process.env.ECHONOTE_PROXY_URL) }));
  ipcMain.handle('transcribe-recording', async (_event, { buffer, includeTimestamps }) => {
    const proxyUrl = process.env.ECHONOTE_PROXY_URL;
    if (!proxyUrl) throw new Error('服务端代理尚未配置');
    const response = await fetch(`${proxyUrl.replace(/\/$/, '')}/v1/transcriptions`, {
      method: 'POST',
      headers: {
        'content-type': 'audio/wav',
        'x-echonote-language': 'zh-en',
        'x-echonote-timestamps': String(Boolean(includeTimestamps))
      },
      body: Buffer.from(buffer),
      signal: AbortSignal.timeout(120000)
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || '转录失败');
    return payload;
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => shortcuts?.dispose());
