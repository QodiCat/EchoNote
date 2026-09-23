const path = require('node:path');

// Keep the recording renderer alive when the user closes the main window.
function createBackground({ app, window, Tray, Menu, nativeImage }) {
  let quitting = false;
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'src', 'assets', 'echonote-tray.png'));
  if (icon.isEmpty()) throw new Error('无法加载 EchoNote 托盘图标');
  const tray = new Tray(icon);
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
