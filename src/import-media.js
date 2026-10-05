async function importMedia() {
  if (state.phase !== 'idle') return;
  if (!serviceReady) { toast('请先打开设置，配置火山引擎转录凭据'); return; }
  state.phase = 'importing';
  setTaskControls(true);
  try {
    if (!state.directory) {
      await chooseDirectory();
      if (!state.directory) { setIdle(); return; }
    }
    $('recordTitle').textContent = '选择本地音频或视频';
    $('recordHint').textContent = '视频将先提取音频；音频和文本保存到新的时间戳文件夹。';
    const result = await window.echoNote.importMedia({ directory: state.directory,
      includeTimestamps: $('timestampToggle').checked });
    if (result.canceled) { setIdle(); return; }
    showTaskResult(result);
  } catch (error) { showTaskResult({ error: error.message || '导入失败，请重试' }); }
  finally { state.phase = 'idle'; setTaskControls(false); }
}

window.echoNote.onTaskProgress(phase => {
  if (!['importing', 'processing'].includes(state.phase)) return;
  const labels = {
    extracting: ['正在提取音频', '正在读取文件中的第一条音轨，请稍候。'],
    'saving-audio': ['正在保存音频', '为本次任务创建独立的时间戳文件夹。'],
    transcribing: ['正在转录', '音频已保存，正在请求火山引擎识别。'],
    'saving-text': ['正在保存文本', '将 Markdown 保存到本次任务文件夹。']
  };
  const label = labels[phase];
  if (!label) return;
  setStatus('PROCESSING');
  $('recordTitle').textContent = label[0]; $('recordHint').textContent = label[1];
});
$('importButton').addEventListener('click', importMedia);
