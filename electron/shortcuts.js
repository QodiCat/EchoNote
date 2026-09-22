const fs = require('node:fs/promises');

function normalize(value) {
  if (typeof value !== 'string' || value.length > 80) throw new Error('快捷键格式不正确');
  if (!value.trim()) return '';
  const parts = value.toUpperCase().replace(/\s/g, '').split('+');
  const key = parts.pop();
  if (!/^(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4]))$/.test(key) ||
      !parts.length || parts.some(part => !['CTRL', 'ALT', 'SHIFT'].includes(part)) ||
      new Set(parts).size !== parts.length || !parts.some(part => part !== 'SHIFT')) {
    throw new Error('请使用 Ctrl 或 Alt 搭配字母、数字或 F1–F24，例如 Ctrl+Alt+R');
  }
  return [...['CTRL', 'ALT', 'SHIFT'].filter(part => parts.includes(part)).map(part => ({ CTRL: 'Ctrl', ALT: 'Alt', SHIFT: 'Shift' })[part]), key].join('+');
}

function validate(settings) {
  const next = { start: normalize(settings?.start), stop: normalize(settings?.stop) };
  if (next.start && next.start === next.stop) throw new Error('开始和结束录音不能使用相同的快捷键');
  return next;
}

function createShortcuts({ registry, filePath, dispatch, storage = fs }) {
  let current = { start: '', stop: '' };
  let startupError = '';
  let busy = false;
  const registered = new Set();
  async function update(settings, persist = true) {
    if (busy) throw new Error('快捷键正在保存，请稍后再试');
    const next = validate(settings);
    busy = true;
    const added = [];
    try {
      for (const key of Object.values(next).filter(Boolean)) {
        if (registered.has(key)) continue;
        let success;
        try {
          success = registry.register(key, () => {
            if (busy) return;
            const action = Object.keys(current).find(name => current[name] === key);
            if (action) dispatch(action);
          });
        } catch { throw new Error(`无法注册 ${key}，请更换快捷键`); }
        if (!success) throw new Error(`${key} 已被其他程序或系统占用，请更换快捷键`);
        registered.add(key);
        added.push(key);
      }
      if (persist) {
        try {
          await storage.writeFile(`${filePath}.tmp`, JSON.stringify(next), 'utf8');
          await storage.rename(`${filePath}.tmp`, filePath);
        } catch { throw new Error('无法保存快捷键设置，请检查本地配置目录权限'); }
      }
      for (const key of registered) {
        if (!Object.values(next).includes(key)) {
          registry.unregister(key);
          registered.delete(key);
        }
      }
      current = next;
      startupError = '';
      return { ...current };
    } catch (error) {
      for (const key of added) { registry.unregister(key); registered.delete(key); }
      throw error;
    } finally { busy = false; }
  }
  return {
    update,
    get: () => ({ settings: { ...current }, error: startupError }),
    async initialize() {
      try {
        await update(JSON.parse(await storage.readFile(filePath, 'utf8')), false);
      } catch (error) {
        if (error.code !== 'ENOENT') startupError = `快捷键未启用，请在设置中重新保存。${error instanceof SyntaxError ? '配置文件格式错误' : error.message}`;
      }
    },
    dispose() { for (const key of registered) registry.unregister(key); registered.clear(); }
  };
}

module.exports = { createShortcuts, validate };
