const path = require('node:path');
const { loadEnv } = require('../config/env');
const { createProxy } = require('./proxy');
const keys = ['PORT', 'MAX_AUDIO_BYTES', 'VOLCENGINE_ASR_ENDPOINT', 'VOLCENGINE_ASR_RESOURCE_ID',
  'VOLCENGINE_ASR_APP_KEY', 'VOLCENGINE_ASR_ACCESS_KEY', 'VOLCENGINE_ASR_TIMEOUT_MS', 'ECHONOTE_PROXY_HOST'];
loadEnv(path.join(__dirname, '..', '.env'), keys);
loadEnv(path.join(__dirname, '..', '.env.example'), keys);
const server = createProxy({ maxBytes: Number(process.env.MAX_AUDIO_BYTES) });
server.on('error', () => { console.error('EchoNote proxy 启动或运行失败，请检查端口和配置'); process.exitCode = 1; });
server.listen(Number(process.env.PORT), process.env.ECHONOTE_PROXY_HOST, () => console.log('EchoNote proxy 已启动'));
