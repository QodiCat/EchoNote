const http = require('node:http');
const crypto = require('node:crypto');
const { transcribe } = require('./volcengine');

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > maxBytes) {
        chunks.length = 0;
        reject(Object.assign(new Error('音频文件超过代理限制'), {
          status: 413, publicMessage: '音频文件超过代理限制'
        }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks, total > maxBytes ? 0 : total)));
    req.on('error', reject);
  });
}

function createProxy({ maxBytes, token, getConfig = () => process.env, transcribeImpl = transcribe }) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new Error('音频大小限制配置无效');
  return http.createServer(async (req, res) => {
    if (token && req.headers.authorization !== `Bearer ${token}`) {
      req.resume();
      return json(res, 401, { error: { message: '本地代理鉴权失败' } });
    }
    if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true });
    if (req.method !== 'POST' || req.url !== '/v1/transcriptions') {
      req.resume();
      return json(res, 404, { error: { code: 'not_found', message: '接口不存在' } });
    }
    const requestId = crypto.randomUUID();
    try {
      const audio = await readBody(req, maxBytes);
      if (!audio.length) return json(res, 400, { error: { code: 'empty_audio', message: '音频不能为空' } });
      const includeTimestamps = req.headers['x-echonote-timestamps'] === 'true';
      const result = await transcribeImpl({ audio, contentType: req.headers['content-type'],
        language: req.headers['x-echonote-language'] || 'zh-en', includeTimestamps, requestId }, fetch, getConfig());
      return json(res, 200, { requestId, text: result.text, timestamps: includeTimestamps ? (result.timestamps || []) : [] });
    } catch (error) {
      return json(res, error.status || 502, { error: {
        code: error.code || 'transcription_failed', message: error.publicMessage || '转录服务暂时不可用', requestId
      } });
    }
  });
}

module.exports = { createProxy };
