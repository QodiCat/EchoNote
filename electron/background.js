// Keep the recording renderer alive when the user closes the main window.
function createBackground({ app, window, Tray, Menu, nativeImage }) {
  let quitting = false;
  const size = 32;
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const bar = x >= 7 && x <= 24 && x % 5 < 3 && Math.abs(y - 16) <= [5, 10, 7, 12][Math.floor((x - 7) / 5)];
      const offset = (y * size + x) * 4;
      pixels.set(bar ? [255, 255, 255, 255] : [190, 100, 45, 255], offset);
    }
  }
  const tray = new Tray(nativeImage.createFromBitmap(pixels, { width: size, height: size }));
  const show = () => {
    if (window.isDestroyed()) return;
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  };
  const beforeQuit = () => { quitting = true; };
  const close = event => {
    if (quitting) return;
    event.preventDefault();
    window.hide();
  };
  tray.setToolTip('EchoNote · 后台运行');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示主窗口', click: show },
    { type: 'separator' },
    { label: '退出 EchoNote（结束当前任务）', click: () => app.quit() }
  ]));
  tray.on('click', show);
  app.on('activate', show);
  app.on('before-quit', beforeQuit);
  window.on('close', close);
  return {
    dispose() {
      window.removeListener('close', close);
      app.removeListener('activate', show);
      app.removeListener('before-quit', beforeQuit);
      tray.destroy();
    }
  };
}

module.exports = { createBackground };
