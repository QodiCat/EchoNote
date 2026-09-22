const state = { phase: 'idle', directory: localStorage.getItem('echonote.directory') || '', recorder: null, chunks: [], startedAt: null, timerId: null, lastFiles: null };
const $ = (id) => document.getElementById(id);

function toast(message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); window.clearTimeout(toast.timer); toast.timer = window.setTimeout(() => el.classList.remove('show'), 3200); }
function setDirectory(directory) { state.directory = directory || ''; if (state.directory) { localStorage.setItem('echonote.directory', state.directory); $('folderPath').textContent = state.directory; $('setupBanner').classList.add('hidden'); } else { $('folderPath').textContent = '尚未设置保存目录'; $('setupBanner').classList.remove('hidden'); } }
function setStatus(label, live = false) { $('statusPill').innerHTML = `<span class="status-dot"></span> ${label}`; $('statusPill').classList.toggle('live', live); }
function setTimer(seconds) { const min = String(Math.floor(seconds / 60)).padStart(2, '0'); const sec = String(seconds % 60).padStart(2, '0'); $('recordingTimer').textContent = `${min}:${sec}`; }
function setIdle() { document.querySelector('.record-card')?.classList.remove('recording'); $('recordTitle').textContent = '准备好开始了吗？'; $('recordHint').textContent = '点击下方按钮，EchoNote 只会捕获电脑播放的系统声音。'; $('recordButton').classList.remove('recording'); $('recordButtonIcon').textContent = '●'; $('recordButtonText').textContent = '开始录音'; $('stopButton').disabled = true; setStatus('READY'); setTimer(0); }
async function chooseDirectory() { const directory = await window.echoNote.selectOutputDirectory(); if (directory) { setDirectory(directory); toast('保存目录已更新'); } }
async function startRecording() {
  if (state.phase !== 'idle') return;
  state.phase = 'starting';
  $('recordButton').disabled = true;
  let stream;
  try {
    if (!state.directory) {
      toast('请先设置保存目录'); await chooseDirectory();
      if (!state.directory) { state.phase = 'idle'; $('recordButton').disabled = false; return; }
    }
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
    state.recorder = null; state.phase = 'idle'; $('recordButton').disabled = false;
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
    const transcriptResult = await window.echoNote.transcribeRecording({ buffer: wavBuffer, includeTimestamps: $('timestampToggle').checked }); const transcript = transcriptResult.text; const baseName = `echonote-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    state.lastFiles = await window.echoNote.saveRecording({ directory: state.directory, buffer, baseName, transcript, includeTimestamps: $('timestampToggle').checked });
    $('activityEmpty').classList.add('hidden'); $('activityResult').classList.remove('hidden'); $('activityStatus').textContent = '已保存'; $('resultDetail').textContent = state.lastFiles.markdownPath; setStatus('SAVED'); $('recordTitle').textContent = '已保存到本地'; $('recordHint').textContent = '你可以开始下一段记录。'; toast('录音和 Markdown 已保存');
  } catch (error) { setStatus('ERROR'); $('recordTitle').textContent = '本次转录失败'; $('recordHint').textContent = '本次录音已结束，请重新点击开始录音。'; toast(error.message || '保存失败'); }
  state.phase = 'idle'; state.chunks = [];
  $('recordButton').disabled = false; $('recordButton').classList.remove('recording'); $('recordButtonIcon').textContent = '●'; $('recordButtonText').textContent = '开始录音'; document.querySelector('.record-card')?.classList.remove('recording'); setTimer(0);
}
async function deleteLast() { if (!state.lastFiles) return; if (!window.confirm('将同时删除录音和 Markdown 文件，确定删除吗？')) return; try { await window.echoNote.deleteRecording(state.lastFiles); state.lastFiles = null; $('activityResult').classList.add('hidden'); $('activityEmpty').classList.remove('hidden'); $('activityStatus').textContent = '暂无记录'; toast('记录已删除'); } catch (error) { toast('删除失败，请检查文件是否被其他程序占用'); } }

setDirectory(state.directory); $('recordButton').addEventListener('click', startRecording); $('stopButton').addEventListener('click', stopRecording); $('setupButton').addEventListener('click', chooseDirectory); $('folderButton').addEventListener('click', chooseDirectory); $('deleteButton').addEventListener('click', deleteLast);
