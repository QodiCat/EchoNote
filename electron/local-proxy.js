const crypto = require('node:crypto');
const { createProxy } = require('../server/proxy');

async function startLocalProxy({ config, getCredentials, transcribeImpl }) {
  const url = new URL(config.ECHONOTE_PROXY_URL);
  if (config.ECHONOTE_PROXY_HOST !== '127.0.0.1' || url.protocol !== 'http:') {
    throw new Error('本地代理必须使用 HTTP 和回环地址');
  }
  const token = crypto.randomBytes(32).toString('hex');
  const server = createProxy({ maxBytes: Number(config.MAX_AUDIO_BYTES), token,
    getConfig: () => ({ ...config, ...getCredentials() }), transcribeImpl });
  let runtimeError = '';
  server.on('error', () => { runtimeError = '本地转录服务运行失败，请重启应用'; });
  await new Promise((resolve, reject) => {
    const fail = () => reject(new Error('本地转录服务启动失败，请检查配置后重启'));
    server.once('error', fail);
    // Port 0 asks Windows for a free port, avoiding existing proxy conflicts.
    server.listen(0, config.ECHONOTE_PROXY_HOST, () => { server.removeListener('error', fail); resolve(); });
  });
  url.hostname = config.ECHONOTE_PROXY_HOST;
  url.port = String(server.address().port);
  return {
    status: () => ({ running: server.listening && !runtimeError, error: runtimeError }),
    async transcribe({ buffer, includeTimestamps }) {
      if (!server.listening || runtimeError) throw new Error(runtimeError || '本地转录服务已停止');
      const response = await fetch(new URL('/v1/transcriptions', url), {
        method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'audio/wav',
          'x-echonote-language': 'zh-en', 'x-echonote-timestamps': String(Boolean(includeTimestamps)) },
        body: Buffer.from(buffer), signal: AbortSignal.timeout(Number(config.VOLCENGINE_ASR_TIMEOUT_MS) + 5000)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || '转录失败');
      return payload;
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
        server.closeAllConnections();
      });
    }
  };
}
module.exports = { startLocalProxy };
