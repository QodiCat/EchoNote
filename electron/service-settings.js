const fs = require('node:fs/promises');
const path = require('node:path');
const { parseEnv } = require('node:util');

function createServiceSettings({ filePath, safeStorage }) {
  let current = null;
  let error = '';
  let saving = false;
  function status() { return { configured: Boolean(current), error }; }
  async function initialize() {
    try {
      const values = parseEnv(await fs.readFile(filePath, 'utf8'));
      if (!safeStorage.isEncryptionAvailable()) throw new Error('encryption unavailable');
      const decoded = JSON.parse(safeStorage.decryptString(Buffer.from(values.CREDENTIALS_ENCRYPTED || '', 'base64')));
      current = validate(decoded);
    } catch (cause) {
      if (cause.code !== 'ENOENT') error = '无法读取已保存的转录凭据，请重新输入并保存';
    }
    return status();
  }
  function validate(value) {
    if (!value || typeof value.appId !== 'string' || typeof value.accessToken !== 'string' ||
      !/^[A-Za-z0-9_-]{1,200}$/.test(value.appId.trim()) ||
      !/^[\x21-\x7e]{1,4096}$/.test(value.accessToken.trim())) {
      throw new Error('请填写有效的 APP ID 和 Access Token');
    }
    return { appId: value.appId.trim(), accessToken: value.accessToken.trim() };
  }
  async function save(input) {
    if (saving) throw new Error('正在保存，请稍候');
    const next = validate(input);
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows 凭据加密不可用，未保存密钥');
    saving = true;
    try {
      const encrypted = safeStorage.encryptString(JSON.stringify(next)).toString('base64');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(`${filePath}.tmp`, `CREDENTIALS_ENCRYPTED=${encrypted}\n`, { mode: 0o600 });
      await fs.rename(`${filePath}.tmp`, filePath);
      current = next;
      error = '';
      return status();
    } catch {
      throw new Error('无法保存转录凭据，请检查本地目录权限');
    } finally { saving = false; }
  }
  function config() {
    if (!current) throw Object.assign(new Error('请在设置中填写火山引擎凭据'), {
      status: 503, publicMessage: '请在设置中填写火山引擎凭据'
    });
    return { VOLCENGINE_ASR_APP_KEY: current.appId, VOLCENGINE_ASR_ACCESS_KEY: current.accessToken };
  }
  return { initialize, status, save, config };
}
module.exports = { createServiceSettings };
