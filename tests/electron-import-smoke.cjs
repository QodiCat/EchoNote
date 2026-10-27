// Hidden-window integration: packaged code + real FFmpeg + local HTTP, synthetic upstream only.
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(process.argv[2] || '.');
const output = path.resolve('dist/import-smoke');
app.setPath('userData', path.join(output, 'profile'));
const timer = setTimeout(() => app.exit(2), 45000);
let window;
let proxy;
let tasks;

app
  .whenReady()
  .then(async () => {
    const runDirectory = path.join(output, String(Date.now()));
    await fs.mkdir(runDirectory, { recursive: true });
    const ffmpegPath = root.endsWith('.asar')
      ? path.join(path.dirname(root), 'media', 'ffmpeg.exe')
      : path.join(root, 'vendor', 'ffmpeg', 'ffmpeg.exe');
    const source = path.join(runDirectory, '合成 视频.mp4');
    const generated = spawnSync(
      ffmpegPath,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-f',
        'lavfi',
        '-i',
        'color=c=black:s=16x16:d=0.3',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:duration=0.3',
        '-c:v',
        'mpeg4',
        '-c:a',
        'aac',
        '-shortest',
        source,
      ],
      { windowsHide: true, timeout: 15000 },
    );
    assert.equal(generated.status, 0, 'Packaged FFmpeg must generate synthetic input');
    const original = await fs.readFile(source);
    const load = (file) => require(path.join(root, file));
    const { createMediaDecoder } = load('electron/media-decoder.js');
    const { createSessionStore } = load('electron/session-store.js');
    const { createTranscriptionTasks } = load('electron/transcription-tasks.js');
    const { startLocalProxy } = load('electron/local-proxy.js');
    const { openResultFolder } = load('electron/result-folder.js');
    const { loadEnv } = load('config/env.js');
    const config = {};
    loadEnv(
      path.join(root, '.env.example'),
      [
        'MAX_AUDIO_BYTES',
        'MAX_MEDIA_BYTES',
        'MEDIA_DECODE_TIMEOUT_MS',
        'ECHONOTE_PROXY_HOST',
        'ECHONOTE_PROXY_URL',
        'VOLCENGINE_ASR_TIMEOUT_MS',
      ],
      config,
    );
    const decoder = createMediaDecoder({
      ffmpegPath,
      maxAudioBytes: Number(config.MAX_AUDIO_BYTES),
      maxMediaBytes: Number(config.MAX_MEDIA_BYTES),
      timeoutMs: Number(config.MEDIA_DECODE_TIMEOUT_MS),
    });
    const store = createSessionStore();
    let failUpstream = false;
    let requests = 0;
    let selected = source;
    let last;
    let opened;
    proxy = await startLocalProxy({
      config,
      getCredentials: () => ({}),
      transcribeImpl: async (input) => {
        requests++;
        assert.equal(input.audio.toString('ascii', 8, 12), 'WAVE');
        if (failUpstream)
          throw Object.assign(new Error('synthetic failure'), { publicMessage: '测试服务不可用' });
        return { text: '这是合成媒体的测试转录结果，用于验证界面与保存流程。' };
      },
    });
    tasks = createTranscriptionTasks({
      store,
      decoder,
      selectMedia: async () => selected,
      ensureConfigured() {},
      transcribe: (value) => proxy.transcribe(value),
      onResult: (files) => {
        last = files;
      },
      onProgress: (phase) => window.webContents.send('task-progress', phase),
    });
    ipcMain.handle('get-shortcuts', () => ({ settings: { start: '', stop: '' } }));
    ipcMain.handle('get-proxy-status', () => ({ configured: true, running: true }));
    ipcMain.handle('select-output-directory', () => path.join(runDirectory, 'results'));
    ipcMain.handle('import-media', (_event, value) => tasks.importMedia(value));
    ipcMain.handle('process-recording', (_event, value) => tasks.processRecording(value));
    ipcMain.handle('open-result-folder', () =>
      openResultFolder(last.recordingPath, {
        openPath: async (directory) => {
          opened = directory;
          return '';
        },
      }),
    );
    ipcMain.handle('delete-recording', () => store.deleteResult(last));
    window = new BrowserWindow({
      show: false,
      width: 1180,
      height: 1020,
      webPreferences: {
        preload: path.join(root, 'electron/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        offscreen: true,
        backgroundThrottling: false,
      },
    });
    const errors = [];
    window.webContents.on('console-message', (event) => {
      if (/Uncaught|ReferenceError|TypeError/.test(event.message || '')) errors.push(event.message);
    });
    await window.loadFile(path.join(root, 'src/index.html'));
    async function clickAndWait(id) {
      await window.webContents.executeJavaScript(`(async () => {
        const button = document.getElementById(${JSON.stringify(id)});
        button.click();
        for (let i = 0; i < 1000 && button.disabled; i++) await new Promise(resolve => setTimeout(resolve, 20));
        if (button.disabled) throw new Error('UI task did not finish');
      })()`);
    }
    await window.webContents.executeJavaScript(`(async () => {
      for (let i = 0; i < 100 && !document.getElementById('serviceStatus').textContent.includes('已就绪'); i++)
        await new Promise(resolve => setTimeout(resolve, 20));
      document.getElementById('folderButton').click();
      for (let i = 0; i < 100 && document.getElementById('folderPath').textContent === '尚未设置保存目录'; i++)
        await new Promise(resolve => setTimeout(resolve, 20));
    })()`);
    await clickAndWait('importButton');
    const first = last;
    assert.ok(first.markdownPath);
    assert.equal(path.dirname(first.markdownPath), path.dirname(first.recordingPath));
    assert.match(path.basename(first.directory), /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}/);
    assert.equal((await fs.readFile(first.recordingPath)).toString('ascii', 8, 12), 'WAVE');
    const ui = await window.webContents
      .executeJavaScript(`({ text: document.getElementById('transcriptPreview').textContent,
    visible: !document.getElementById('transcriptPanel').classList.contains('hidden'), idle: !document.getElementById('recordButton').disabled, disabled: document.getElementById('importButton').disabled })`);
    assert.match(ui.text, /测试转录结果/);
    assert.equal(ui.visible, true);
    assert.equal(ui.idle, true);
    assert.equal(ui.disabled, false);
    await clickAndWait('openResultFolder');
    assert.equal(opened, first.directory);
    window.webContents.invalidate();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await fs.writeFile(
      path.join(output, 'import-success.png'),
      (await window.webContents.capturePage()).toPNG(),
    );
    selected = null;
    await clickAndWait('importButton');
    assert.equal(requests, 1);
    selected = source;
    failUpstream = true;
    await clickAndWait('importButton');
    assert.notEqual(last.directory, first.directory);
    assert.equal(last.markdownPath, null);
    assert.equal((await fs.stat(last.recordingPath)).isFile(), true);
    assert.equal(
      await window.webContents.executeJavaScript(
        "document.getElementById('resultTitle').textContent",
      ),
      '仅保存音频',
    );
    await window.webContents.executeJavaScript('void (window.confirm = () => true)');
    await clickAndWait('deleteButton');
    await assert.rejects(fs.stat(last.directory), { code: 'ENOENT' });
    assert.deepEqual(await fs.readFile(source), original);
    assert.equal((await fs.stat(first.markdownPath)).isFile(), true);
    assert.deepEqual(errors, []);
    tasks.dispose();
    await proxy.close();
    await fs.writeFile(
      path.join(output, 'result.json'),
      JSON.stringify(
        {
          passed: true,
          checks: [
            'packaged FFmpeg',
            'video extraction',
            'UI/IPC/local proxy',
            'timestamp folder with audio and text',
            'transcript preview',
            'open-folder routing',
            'cancel',
            'upstream failure retains audio',
            'delete preserves source',
          ],
          cloud: 'synthetic upstream; no external audio requests',
          runDirectory,
        },
        null,
        2,
      ),
    );
    clearTimeout(timer);
    window.destroy();
    app.quit();
  })
  .catch(async (error) => {
    tasks?.dispose();
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(
      path.join(output, 'result.json'),
      JSON.stringify({ passed: false, error: error.message, stack: error.stack }),
    );
    app.exit(1);
  });
