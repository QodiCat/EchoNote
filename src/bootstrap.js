(function () {
  const {
    createRenderer,
    initializeImport,
    initializeSettings,
    initializeServiceSettings,
    audioFormat,
  } = window.EchoNoteModules;
  const renderer = createRenderer({
    document,
    window,
    localStorage,
    navigator,
    MediaStream,
    MediaRecorder,
    recordingToWav: audioFormat.recordingToWav,
  });
  initializeImport({ renderer, window });
  initializeSettings({ renderer, window });
  initializeServiceSettings({ renderer, window });
  window.echoNoteActions = Object.freeze({
    startRecording: () => {
      if (!document.getElementById('settingsDialog').open) return renderer.startRecording();
    },
    stopRecording: renderer.stopRecording,
  });
})();
