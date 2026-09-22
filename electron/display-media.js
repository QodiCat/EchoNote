function createDisplayMediaHandler(desktopCapturer, reportError = console.error) {
  return async (_request, callback) => {
    let source;
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 0, height: 0 }
      });
      source = sources[0];
    } catch {
      reportError('无法获取系统录音所需的屏幕来源');
    }
    if (!source) {
      // An empty response denies capture; getDisplayMedia rejects in the UI.
      callback({});
      return;
    }
    callback({ video: source, audio: 'loopback' });
  };
}

module.exports = { createDisplayMediaHandler };
