function createTranscriptionTasks({ store, decoder, selectMedia, ensureConfigured, transcribe, onProgress = () => {}, onResult = () => {} }) {
  let busy = false;
  let disposed = false;
  function checkActive() { if (disposed) throw new Error('应用正在退出'); }
  async function run(kind, payload) {
    if (busy || disposed) return { error: '已有任务正在处理或应用正在退出' };
    busy = true;
    let files;
    try {
      checkActive();
      ensureConfigured();
      let audio;
      let wav;
      let startedAt = payload.startedAt || Date.now();
      if (kind === 'import') {
        const selected = await selectMedia();
        checkActive();
        if (!selected) return { canceled: true };
        startedAt = Date.now();
        onProgress('extracting');
        wav = await decoder.decode(selected);
        audio = wav;
      } else {
        audio = Buffer.from(payload.buffer);
        wav = Buffer.from(payload.wavBuffer);
        if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') {
          throw new Error('录音转换失败，未提交转录');
        }
      }
      checkActive();
      onProgress('saving-audio');
      files = await store.saveAudio({ directory: payload.directory, buffer: audio,
        format: kind === 'import' ? 'wav' : 'webm', startedAt });
      checkActive();
      onProgress('transcribing');
      const result = await transcribe({ buffer: wav, includeTimestamps: payload.includeTimestamps });
      checkActive();
      onProgress('saving-text');
      await store.saveTranscript(files, result.text, payload.includeTimestamps);
      onResult(files);
      return { files, text: result.text };
    } catch (error) {
      if (files) onResult(files);
      return { error: error.message || '本次处理失败', files };
    } finally { busy = false; }
  }
  return {
    importMedia: payload => run('import', payload),
    processRecording: payload => run('recording', payload),
    isBusy: () => busy,
    dispose() { disposed = true; decoder.dispose(); }
  };
}
module.exports = { createTranscriptionTasks };
