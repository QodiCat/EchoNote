const { app, BrowserWindow, dialog, ipcMain, session, desktopCapturer, globalShortcut, Tray, Menu, nativeImage, safeStorage, shell } = require('electron');
const { openResultFolder } = require('./result-folder');
const { createBackground } = require('./background');
const { createShortcuts } = require('./shortcuts');
const { createDisplayMediaHandler } = require('./display-media');
const { createSessionStore } = require('./session-store');
const { createMediaDecoder, extensions } = require('./media-decoder');
const { createTranscriptionTasks } = require('./transcription-tasks');
const path = require('node:path');
const { loadEnv } = require('../config/env');

const { createServiceSettings } = require('./service-settings');
const { startLocalProxy } = require('./local-proxy');
const serviceConfig = {};
const serviceKeys = ['MAX_AUDIO_BYTES', 'VOLCENGINE_ASR_ENDPOINT', 'VOLCENGINE_ASR_RESOURCE_ID',
  'VOLCENGINE_ASR_TIMEOUT_MS', 'ECHONOTE_PROXY_URL', 'ECHONOTE_PROXY_HOST', 'MAX_MEDIA_BYTES', 'MEDIA_DECODE_TIMEOUT_MS'];
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
let tasks;
const sessionStore = createSessionStore();

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
    try {
      if (tasks?.isBusy()) throw new Error('请等待当前任务结束后修改凭据');
      await serviceSettings.save(settings); return proxyStatus();
    }
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

  const decoder = createMediaDecoder({
    ffmpegPath: app.isPackaged ? path.join(process.resourcesPath, 'media', 'ffmpeg.exe')
      : path.join(__dirname, '..', 'vendor', 'ffmpeg', 'ffmpeg.exe'),
    maxAudioBytes: Number(serviceConfig.MAX_AUDIO_BYTES), maxMediaBytes: Number(serviceConfig.MAX_MEDIA_BYTES),
    timeoutMs: Number(serviceConfig.MEDIA_DECODE_TIMEOUT_MS)
  });
  tasks = createTranscriptionTasks({
    store: sessionStore, decoder,
    ensureConfigured() {
      if (!localProxy?.status().running) throw new Error(proxyError || '本地转录服务未启动');
      if (!serviceSettings.status().configured) throw new Error('请先在设置中填写火山引擎凭据');
    },
    selectMedia: async () => {
      const result = await dialog.showOpenDialog(mainWindow, { title: '选择音频或视频', properties: ['openFile'],
        filters: [{ name: '音频与视频', extensions }] });
      return result.canceled ? null : result.filePaths[0];
    },
    transcribe: payload => localProxy.transcribe(payload),
    onProgress: phase => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('task-progress', phase);
    },
    onResult: files => { lastSavedFiles = files; }
  });
  ipcMain.handle('process-recording', (_event, payload) => tasks.processRecording(payload));
  ipcMain.handle('import-media', (_event, payload) => tasks.importMedia(payload));
  ipcMain.handle('delete-recording', async () => {
    if (tasks.isBusy()) throw new Error('请等待当前任务结束后删除');
    const deletedFiles = lastSavedFiles;
    const result = await sessionStore.deleteResult(deletedFiles);
    if (lastSavedFiles === deletedFiles) lastSavedFiles = null;
    return result;
  });
  ipcMain.handle('open-result-folder', () => openResultFolder(lastSavedFiles?.recordingPath, {
    openPath: directory => shell.openPath(directory)
  }));
  createWindow();
  background = createBackground({ app, window: mainWindow, Tray, Menu, nativeImage });
}).catch(() => { dialog.showErrorBox('启动失败', 'EchoNote 初始化失败，请检查本地配置和目录权限'); app.quit(); });

app.on('before-quit', event => {
  tasks?.dispose();
  if (!localProxy || proxyClosed) return;
  event.preventDefault();
  if (closing) return;
  closing = true;
  localProxy.close().catch(() => dialog.showErrorBox('退出提示', '本地转录服务关闭失败，应用将结束进程'))
    .finally(() => { proxyClosed = true; app.quit(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => { background?.dispose(); shortcuts?.dispose(); });
