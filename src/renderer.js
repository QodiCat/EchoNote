const state = { phase: 'idle', directory: localStorage.getItem('echonote.directory') || '', recorder: null, chunks: [], startedAt: null, timerId: null, lastFiles: null };
const $ = (id) => document.getElementById(id);
let serviceReady = false;

function toast(message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); window.clearTimeout(toast.timer); toast.timer = window.setTimeout(() => el.classList.remove('show'), 3200); }
function setDirectory(directory) { state.directory = directory || ''; if (state.directory) { localStorage.setItem('echonote.directory', state.directory); $('folderPath').textContent = state.directory; $('setupBanner').classList.add('hidden'); } else { $('folderPath').textContent = '尚未设置保存目录'; $('setupBanner').classList.remove('hidden'); } }
function setStatus(label, live = false) { const labels = { READY: '就绪', RECORDING: '录音中', PROCESSING: '转录中', SAVED: '已保存', ERROR: '失败' }; $('statusPill').innerHTML = `<span class="status-dot"></span> ${labels[label] || label}`; $('statusPill').classList.toggle('live', live); }
function setTimer(seconds) { const min = String(Math.floor(seconds / 60)).padStart(2, '0'); const sec = String(seconds % 60).padStart(2, '0'); $('recordingTimer').textContent = `${min}:${sec}`; }
function setIdle() { document.querySelector('.record-card')?.classList.remove('recording'); $('recordTitle').textContent = '待录音'; $('recordHint').textContent = '停止后自动转录'; $('recordButton').classList.remove('recording'); $('recordButtonIcon').textContent = '●'; $('recordButtonText').textContent = '开始录音'; $('stopButton').disabled = true; setStatus('READY'); setTimer(0); }
async function chooseDirectory() { const directory = await window.echoNote.selectOutputDirectory(); if (directory) { setDirectory(directory); toast('保存目录已更新'); } }
async function startRecording() {
  if (state.phase !== 'idle') return;
  if (!serviceReady) { toast('请先打开设置，配置火山引擎转录凭据'); return; }
  state.phase = 'starting';
  setTaskControls(true);
  let stream;
  try {
    if (!state.directory) {
      toast('请先设置保存目录'); await chooseDirectory();
      if (!state.directory) { state.phase = 'idle'; setTaskControls(false); return; }
    }
    state.taskDirectory = state.directory;
    state.taskTimestamps = $('timestampToggle').checked;
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    stream.getVideoTracks().forEach((track) => track.stop());
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) throw new Error('没有检测到系统播放声音，请确认共享音频已开启');
    const audioStream = new MediaStream(audioTracks);
    state.recorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm;codecs=opus' });
    state.chunks = []; state.startedAt = Date.now();
    state.recorder.ondataavailable = (event) => { if (event.data.size) state.chunks.push(event.data); };
    state.recorder.onstop = finishRecording;
    audioTracks.forEach((track) => { track.onended = () => { if (state.recorder?.state === 'recording') stopRecording(); }; });
    state.recorder.start(); state.phase = 'recording'; $('record-card').classList.add('recording'); $('recordButton').classList.add('recording'); $('recordButtonIcon').textContent = '■'; $('recordButtonText').textContent = '录音中'; $('stopButton').disabled = false; $('recordTitle').textContent = '正在记录系统声音'; $('recordHint').textContent = '结束后会自动进入转录流程。'; setStatus('RECORDING', true); state.timerId = window.setInterval(() => setTimer(Math.floor((Date.now() - state.startedAt) / 1000)), 500);
  } catch (error) {
    stream?.getTracks().forEach(track => track.stop());
    state.recorder = null; state.phase = 'idle'; setTaskControls(false);
    toast(error.message || '无法开始录音'); setIdle();
  }
}
function stopRecording() {
  if (state.phase === 'recording' && state.recorder?.state === 'recording') {
    state.phase = 'processing'; $('stopButton').disabled = true;
    window.clearInterval(state.timerId); state.recorder.stop();
  }
}
async function finishRecording() {
  state.phase = 'processing';
  state.recorder?.stream.getTracks().forEach(track => track.stop());
  const blob = new Blob(state.chunks, { type: 'audio/webm' }); state.recorder = null; setStatus('PROCESSING'); $('recordTitle').textContent = '录音已完成'; $('recordHint').textContent = '正在准备转录，请稍候。'; $('recordButton').disabled = true; $('stopButton').disabled = true;
  try {
    const buffer = await blob.arrayBuffer();
    const wavBuffer = await recordingToWav(buffer);
    const result = await window.echoNote.processRecording({ directory: state.taskDirectory, buffer, wavBuffer,
      startedAt: state.startedAt, includeTimestamps: state.taskTimestamps });
    showTaskResult(result);
  } catch (error) { showTaskResult({ error: error.message || '无法处理录音' }); }
  state.phase = 'idle'; state.chunks = [];
  setTaskControls(false); $('recordButton').classList.remove('recording'); $('recordButtonIcon').textContent = '●'; $('recordButtonText').textContent = '开始录音'; document.querySelector('.record-card')?.classList.remove('recording'); setTimer(0);
}
function setTaskControls(busy) {
  for (const id of ['recordButton', 'importButton', 'folderButton', 'setupButton', 'settingsFolder', 'timestampToggle', 'deleteButton']) {
    $(id).disabled = busy;
  }
}

function showTaskResult(result) {
  if (result.files) {
    state.lastFiles = result.files;
    $('activityEmpty').classList.add('hidden'); $('activityResult').classList.remove('hidden');
    $('activityStatus').textContent = result.files.markdownPath ? '已保存' : '音频已保留';
    $('resultTitle').textContent = result.files.markdownPath ? '转录完成' : '仅保存音频';
    $('resultDetail').textContent = result.files.directory || result.files.recordingPath;
    $('transcriptPreview').textContent = result.text || '';
    $('transcriptPanel').classList.toggle('hidden', !result.files.markdownPath);
  }
  if (result.error) {
    setStatus('ERROR'); $('recordTitle').textContent = '本次处理未完成';
    $('recordHint').textContent = result.files ? '音频已保留，可打开文件夹查看或重新导入。' : '请选择文件或重新开始录音。';
    toast(result.error);
  } else {
    setStatus('SAVED'); $('recordTitle').textContent = '音频与文本已保存';
    $('recordHint').textContent = '已保存到本次任务的独立文件夹。'; toast('音频和 Markdown 已保存');
  }
}

async function deleteLast() {
  if (!state.lastFiles || state.phase !== 'idle') return;
  const prompt = state.lastFiles.markdownPath
    ? '将删除本次保存的音频和 Markdown 文件（不影响导入的原文件），确定删除吗？'
    : '将删除本次保存的音频（不影响导入的原文件），确定删除吗？';
  if (!window.confirm(prompt)) return;
  state.phase = 'deleting';
  setTaskControls(true);
  try {
    const result = await window.echoNote.deleteRecording(); state.lastFiles = null;
    $('activityResult').classList.add('hidden'); $('activityEmpty').classList.remove('hidden');
    $('transcriptPanel').classList.add('hidden'); $('transcriptPreview').textContent = '';
    $('activityStatus').textContent = '暂无记录';
    toast(result.folderRetained ? '结果已删除，文件夹中的其他文件已保留' : '本次结果和空文件夹已删除');
  } catch { toast('删除失败，请检查文件是否被占用；部分文件可能已删除'); }
  finally { state.phase = 'idle'; setTaskControls(false); }
}

async function openLastFolder() {
  if (!state.lastFiles || $('openResultFolder').disabled) return;
  $('openResultFolder').disabled = true;
  try {
    const result = await window.echoNote.openResultFolder();
    if (result.error) toast(result.error);
  } catch { toast('无法打开转录文件夹，请重试'); }
  finally { $('openResultFolder').disabled = false; }
}
$('openResultFolder').addEventListener('click', openLastFolder);

setDirectory(state.directory); $('recordButton').addEventListener('click', startRecording); $('stopButton').addEventListener('click', stopRecording); $('setupButton').addEventListener('click', chooseDirectory); $('folderButton').addEventListener('click', chooseDirectory); $('deleteButton').addEventListener('click', deleteLast);
