// Run with Electron, passing an unpacked app.asar path. Uses synthetic credentials only.
const { app, BrowserWindow, ipcMain, safeStorage } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(process.argv[2] || '.');
const output = path.resolve('dist/smoke');
app.setPath('userData', path.join(output, 'profile'));
let proxy;
let window;
const timer = setTimeout(() => app.exit(2), 30000);
app.whenReady().then(async () => {
  await fs.mkdir(output, { recursive: true });
  const { loadEnv } = require(path.join(root, 'config/env.js'));
  const { createServiceSettings } = require(path.join(root, 'electron/service-settings.js'));
  const { startLocalProxy } = require(path.join(root, 'electron/local-proxy.js'));
  const config = {};
  loadEnv(path.join(root, '.env.example'), ['MAX_AUDIO_BYTES', 'ECHONOTE_PROXY_HOST',
    'ECHONOTE_PROXY_URL', 'VOLCENGINE_ASR_TIMEOUT_MS'], config);
  const filePath = path.join(output, `credentials-${Date.now()}.env`);
  const settings = createServiceSettings({ filePath, safeStorage });
  await settings.initialize();
  assert.equal(safeStorage.isEncryptionAvailable(), true);
  proxy = await startLocalProxy({ config, getCredentials: settings.config });
  const status = () => ({ ...settings.status(), ...proxy.status() });
  ipcMain.handle('get-shortcuts', () => ({ settings: { start: '', stop: '' } }));
  ipcMain.handle('get-proxy-status', status);
  ipcMain.handle('save-service-settings', async (_event, value) => { await settings.save(value); return status(); });
  window = new BrowserWindow({ show: false, width: 1180, height: 760, webPreferences: {
    preload: path.join(root, 'electron/preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false
  } });
  const errors = [];
  window.webContents.on('console-message', (_event, _level, message) => {
    if (/Uncaught|ReferenceError|TypeError/.test(message)) errors.push(message);
  });
  await window.loadFile(path.join(root, 'src/index.html'));
  const result = await window.webContents.executeJavaScript(`(async () => {
    for (let i = 0; i < 100 && document.getElementById('settingsButton').disabled; i++) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    document.getElementById('settingsButton').click();
    const before = await window.echoNote.getProxyStatus();
    document.getElementById('serviceAppId').value = '123456';
    document.getElementById('serviceAccessToken').value = 'synthetic-smoke-token';
    document.getElementById('serviceForm').requestSubmit();
    for (let i = 0; i < 100 && !document.getElementById('serviceStatus').textContent.includes('已就绪'); i++) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    return { before, after: await window.echoNote.getProxyStatus(),
      dialogOpen: document.getElementById('settingsDialog').open,
      cleared: document.getElementById('serviceAccessToken').value === '',
      status: document.getElementById('serviceStatus').textContent };
  })()`);
  assert.equal(result.before.configured, false);
  assert.equal(result.after.configured, true);
  assert.equal(result.after.running, true);
  assert.equal(result.dialogOpen, true);
  assert.equal(result.cleared, true);
  assert.deepEqual(errors, []);
  assert.doesNotMatch(await fs.readFile(filePath, 'utf8'), /synthetic-smoke-token/);
  const restored = createServiceSettings({ filePath, safeStorage });
  assert.equal((await restored.initialize()).configured, true);
  assert.equal(restored.config().VOLCENGINE_ASR_ACCESS_KEY, 'synthetic-smoke-token');
  await fs.writeFile(path.join(output, 'settings.png'), (await window.webContents.capturePage()).toPNG());
  await proxy.close();
  assert.equal(proxy.status().running, false);
  proxy = null;
  await fs.unlink(filePath);
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ passed: true,
    checks: ['packaged assets', 'Windows safeStorage', 'settings form IPC', 'credential restart', 'proxy start/stop'], result }, null, 2));
  clearTimeout(timer);
  window.destroy();
  app.quit();
}).catch(async error => {
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ passed: false, error: error.message }));
  app.exit(1);
});
