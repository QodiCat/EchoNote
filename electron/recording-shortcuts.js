function createRecordingDispatcher({ getWindow, onError }) {
  return async function dispatch(action) {
    const window = getWindow();
    if (!window || window.isDestroyed() || window.webContents.isLoading()) return;
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
    const method = { start: 'startRecording', stop: 'stopRecording' }[action];
    if (!method) throw new Error('未知录音操作');
    try {
      // Electron needs the real keyboard gesture for display-media capture.
      await window.webContents.executeJavaScript(`window.echoNoteActions.${method}()`, true);
    } catch (error) {
      onError(error);
    }
  };
}
module.exports = { createRecordingDispatcher };
