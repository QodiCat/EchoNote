const { app, BrowserWindow, dialog, ipcMain, session } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

let mainWindow;

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

  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    callback({ video: request.video, audio: 'loopback' });
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
}

app.whenReady().then(() => {
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
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
