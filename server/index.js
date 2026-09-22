const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { loadEnv } = require('../config/env');
loadEnv(path.join(__dirname, '..', '.env'), [
  'PORT', 'MAX_AUDIO_BYTES', 'VOLCENGINE_ASR_ENDPOINT',
  'VOLCENGINE_ASR_RESOURCE_ID', 'VOLCENGINE_ASR_APP_KEY',
  'VOLCENGINE_ASR_ACCESS_KEY', 'VOLCENGINE_ASR_TIMEOUT_MS'
]);
const { transcribe } = require('./volcengine');

const port = Number(process.env.PORT || 8787);
const maxBytes = Number(process.env.MAX_AUDIO_BYTES || 100 * 1024 * 1024);

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(Object.assign(new Error('音频文件超过代理限制'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks, total)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true });
  if (req.method !== 'POST' || req.url !== '/v1/transcriptions') return json(res, 404, { error: { code: 'not_found', message: '接口不存在' } });

  const requestId = crypto.randomUUID();
  try {
    const audio = await readBody(req);
    if (!audio.length) return json(res, 400, { error: { code: 'empty_audio', message: '音频不能为空' } });
    const language = req.headers['x-echonote-language'] || 'zh-en';
    const includeTimestamps = req.headers['x-echonote-timestamps'] === 'true';
    const result = await transcribe({ audio, contentType: req.headers['content-type'], language, includeTimestamps, requestId });
    return json(res, 200, { requestId, text: result.text, timestamps: includeTimestamps ? (result.timestamps || []) : [] });
  } catch (error) {
    const status = error.status || 502;
    return json(res, status, { error: { code: error.code || 'transcription_failed', message: error.publicMessage || '转录服务暂时不可用', requestId } });
  }
});

server.listen(port, () => console.log(`EchoNote proxy listening on ${port}`));
