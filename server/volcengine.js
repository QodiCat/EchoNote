const upstreamUrl = process.env.VOLCENGINE_ASR_ENDPOINT || 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash';
const resourceId = process.env.VOLCENGINE_ASR_RESOURCE_ID || 'volc.bigasr.auc_turbo';
const timeoutMs = Number(process.env.VOLCENGINE_ASR_TIMEOUT_MS || 120000);

function configError(message) { return Object.assign(new Error(message), { status: 503, code: 'proxy_not_configured', publicMessage: message }); }

function extractResult(payload) {
  const text = payload?.result?.text ?? payload?.result?.utterances?.map((item) => item.text).join('') ?? payload?.text ?? payload?.data?.text;
  if (typeof text !== 'string') throw Object.assign(new Error('上游响应缺少转录文本'), { code: 'invalid_upstream_response', publicMessage: '转录服务返回了无法识别的结果' });
  return { text, timestamps: payload?.result?.utterances || payload?.utterances || [] };
}

function upstreamError(response) {
  const rawCode = response.headers.get('x-api-status-code');
  const code = /^\d{8}$/.test(rawCode || '') ? rawCode : null;
  const messages = {
    '20000003': '录音中没有识别到语音，请播放语音后重新录制',
    '45000001': '转录请求参数无效',
    '45000002': '录音内容为空',
    '45000151': '转录服务不支持当前音频格式',
    '55000031': '转录服务繁忙，请稍后重新录制'
  };
  let message = messages[code] || '火山引擎转录失败';
  if (response.status === 401) message = '火山引擎鉴权失败，请检查服务端凭据';
  if (response.status === 403) message = '火山引擎拒绝访问，请检查凭据和服务开通权限';
  if (response.status === 429) message = '火山引擎请求受限，请检查配额和并发限制';
  return Object.assign(new Error('upstream request rejected'), {
    code: 'upstream_error',
    publicMessage: `${message}（HTTP ${response.status}${code ? `，服务码 ${code}` : ''}）`
  });
}

async function transcribe({ audio, contentType, includeTimestamps, requestId }, fetchImpl = fetch) {
  const appKey = process.env.VOLCENGINE_ASR_APP_KEY;
  const accessKey = process.env.VOLCENGINE_ASR_ACCESS_KEY;
  if (!appKey || !accessKey) throw configError('服务端代理尚未配置火山引擎凭据');
  if (contentType !== 'audio/wav' || audio.length < 44 ||
      audio.toString('ascii', 0, 4) !== 'RIFF' || audio.toString('ascii', 8, 12) !== 'WAVE') {
    throw Object.assign(new Error('unsupported audio'), {
      status: 400, code: 'invalid_audio_format', publicMessage: '请重启桌面应用，使用 WAV 格式提交转录'
    });
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Api-App-Key': appKey,
    'X-Api-Access-Key': accessKey,
    'X-Api-Resource-Id': resourceId,
    'X-Api-Request-Id': requestId,
    'X-Api-Sequence': '-1'
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body = JSON.stringify({
      user: { uid: requestId },
      audio: { data: audio.toString('base64') },
      request: { model_name: 'bigmodel', enable_punc: true, show_utterances: Boolean(includeTimestamps) }
    });
    const response = await fetchImpl(upstreamUrl, { method: 'POST', headers, body, signal: controller.signal });
    if (!response.ok || response.headers.get('x-api-status-code') !== '20000000') {
      await response.body?.cancel();
      throw upstreamError(response);
    }
    const raw = await response.text();
    let payload;
    try { payload = JSON.parse(raw); } catch { throw Object.assign(new Error('上游响应不是 JSON'), { code: 'invalid_upstream_json', publicMessage: '转录服务返回格式异常' }); }
    return extractResult(payload);
  } catch (error) {
    if (error.name === 'AbortError') throw Object.assign(new Error('upstream timeout'), { code: 'upstream_timeout', publicMessage: '转录超时，请重新开始录音' });
    if (error instanceof TypeError) throw Object.assign(new Error('upstream network failure'), { code: 'upstream_network_error', publicMessage: '无法连接火山引擎，请检查代理服务器网络' });
    throw error;
  } finally { clearTimeout(timer); }
}

module.exports = { transcribe };
