const { app, BrowserWindow, dialog, ipcMain, session, desktopCapturer, globalShortcut, Tray, Menu, nativeImage, safeStorage, shell } = require('electron');
const { openResultFolder } = require('./result-folder');
const { createBackground } = require('./background');
const { createShortcuts } = require('./shortcuts');
const { createDisplayMediaHandler } = require('./display-media');
const fs = require('node:fs/promises');
const path = require('node:path');
const { loadEnv } = require('../config/env');

const { createServiceSettings } = require('./service-settings');
const { startLocalProxy } = require('./local-proxy');
const serviceConfig = {};
const serviceKeys = ['MAX_AUDIO_BYTES', 'VOLCENGINE_ASR_ENDPOINT', 'VOLCENGINE_ASR_RESOURCE_ID',
  'VOLCENGINE_ASR_TIMEOUT_MS', 'ECHONOTE_PROXY_URL', 'ECHONOTE_PROXY_HOST'];
if (!app.isPackaged) loadEnv(path.join(__dirname, '..', '.env'), serviceKeys, serviceConfig);
loadEnv(path.join(__dirname, '..', '.env.example'), serviceKeys, serviceConfig);
let localProxy;
let serviceSettings;
let proxyError = '';
let closing = false;
let proxyClosed = false;
const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();
app.on('second-instance', () => {
  if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); }
});

let mainWindow;
let shortcuts;
let background;
let lastSavedFiles = null;

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
    icon: path.join(__dirname, '..', 'src', 'assets', 'echonote.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      sandbox: false
    }
  });

  session.defaultSession.setDisplayMediaRequestHandler(createDisplayMediaHandler(desktopCapturer));

  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
}

app.whenReady().then(async () => {
  if (!hasLock) return;
  serviceSettings = createServiceSettings({ filePath: path.join(app.getPath('userData'), 'transcription.env'), safeStorage });
  await serviceSettings.initialize();
  try { localProxy = await startLocalProxy({ config: serviceConfig, getCredentials: () => serviceSettings.config() }); }
  catch { proxyError = '本地转录服务启动失败，请检查配置后重启应用'; }
  const proxyStatus = () => ({ ...serviceSettings.status(), running: Boolean(localProxy?.status().running),
    error: proxyError || localProxy?.status().error || serviceSettings.status().error });
  ipcMain.handle('get-proxy-status', proxyStatus);
  ipcMain.handle('save-service-settings', async (_event, settings) => {
    try { await serviceSettings.save(settings); return proxyStatus(); }
    catch (error) { return { error: error.message }; }
  });
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
    lastSavedFiles = { recordingPath, markdownPath };
    return lastSavedFiles;
  });

  ipcMain.handle('delete-recording', async (_event, { recordingPath, markdownPath }) => {
    await Promise.all([fs.rm(recordingPath, { force: false }), fs.rm(markdownPath, { force: false })]);
    if (lastSavedFiles?.markdownPath === markdownPath) lastSavedFiles = null;
    return true;
  });

  ipcMain.handle('open-result-folder', () => openResultFolder(lastSavedFiles?.markdownPath, {
    openPath: directory => shell.openPath(directory)
  }));

  ipcMain.handle('transcribe-recording', async (_event, payload) => {
    if (!localProxy) throw new Error(proxyError || '本地转录服务未启动');
    if (!serviceSettings.status().configured) throw new Error('请先在设置中填写火山引擎 APP ID 和 Access Token');
    return localProxy.transcribe(payload);
  });
  createWindow();
  background = createBackground({ app, window: mainWindow, Tray, Menu, nativeImage });
}).catch(() => { dialog.showErrorBox('启动失败', 'EchoNote 初始化失败，请检查本地配置和目录权限'); app.quit(); });

app.on('before-quit', event => {
  if (!localProxy || proxyClosed) return;
  event.preventDefault();
  if (closing) return;
  closing = true;
  localProxy.close().catch(() => dialog.showErrorBox('退出提示', '本地转录服务关闭失败，应用将结束进程'))
    .finally(() => { proxyClosed = true; app.quit(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => { background?.dispose(); shortcuts?.dispose(); });
