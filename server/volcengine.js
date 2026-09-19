const crypto = require('node:crypto');

const upstreamUrl = process.env.VOLCENGINE_ASR_ENDPOINT || 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash';
const resourceId = process.env.VOLCENGINE_ASR_RESOURCE_ID || 'volc.bigasr.auc_turbo';
const timeoutMs = Number(process.env.VOLCENGINE_ASR_TIMEOUT_MS || 120000);

function configError(message) { return Object.assign(new Error(message), { status: 503, code: 'proxy_not_configured', publicMessage: message }); }

function extractResult(payload) {
  const text = payload?.result?.text ?? payload?.result?.utterances?.map((item) => item.text).join('') ?? payload?.text ?? payload?.data?.text;
  if (typeof text !== 'string') throw Object.assign(new Error('上游响应缺少转录文本'), { code: 'invalid_upstream_response', publicMessage: '转录服务返回了无法识别的结果' });
  return { text, timestamps: payload?.result?.utterances || payload?.utterances || [] };
}

async function transcribe({ audio, contentType, language, includeTimestamps, requestId }) {
  const appKey = process.env.VOLCENGINE_ASR_APP_KEY;
  const accessKey = process.env.VOLCENGINE_ASR_ACCESS_KEY;
  if (!appKey || !accessKey) throw configError('服务端代理尚未配置火山引擎凭据');

  const headers = {
    'Content-Type': contentType,
    'X-Api-App-Key': appKey,
    'X-Api-Access-Key': accessKey,
    'X-Api-Resource-Id': resourceId,
    'X-Api-Request-Id': requestId,
    'X-Api-Sequence': '-1'
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(upstreamUrl, { method: 'POST', headers, body: audio, signal: controller.signal });
    const raw = await response.text();
    let payload;
    try { payload = JSON.parse(raw); } catch { throw Object.assign(new Error('上游响应不是 JSON'), { code: 'invalid_upstream_json', publicMessage: '转录服务返回格式异常' }); }
    if (!response.ok) throw Object.assign(new Error(`upstream status ${response.status}`), { code: 'upstream_error', publicMessage: '火山引擎转录失败' });
    return extractResult(payload);
  } catch (error) {
    if (error.name === 'AbortError') throw Object.assign(new Error('upstream timeout'), { code: 'upstream_timeout', publicMessage: '转录超时，请重新开始录音' });
    throw error;
  } finally { clearTimeout(timer); }
}

module.exports = { transcribe };
