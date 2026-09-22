# EchoNote 服务端代理契约（已实现部分，真实联调待验证）

客户端不得直接持有火山引擎凭据。服务端代理只接收当前转录请求，调用火山引擎 STT，并在响应后立即清理请求体、响应体和临时缓存。

## 约束

- 不持久化音频、文字、可还原内容或请求体副本。
- 日志不得记录音频、转录文字、凭据或可识别用户内容。
- 需要明确请求大小、超时、取消、错误映射和内存清理策略。
- 客户端只接收转录结果或结构化错误，不直接获得供应商密钥。

## 接口

- `POST /v1/transcriptions`
- 请求：WAV 音频二进制；`Content-Type: audio/wav`；`X-EchoNote-Language` 为 `zh-en`；`X-EchoNote-Timestamps` 表示是否需要时间戳。当前由上游自动识别中英文，不将 `zh-en` 作为单一语言代码传给上游。
- 响应：转录文本、可选时间戳片段、请求 ID。
- 失败：返回可展示给用户的错误类别；客户端本次录音流程结束，用户重新开始。

当前实现：`server/index.js` 负责接收请求和生命周期，`server/volcengine.js` 负责火山引擎适配。服务端仅以内存 Buffer 处理请求，未写入磁盘。

## 请求格式修复

桌面端在停止录音后使用 Web Audio 在内存中将 WebM 解码为 16 kHz 单声道 PCM16 WAV，再提交给代理。本地保存仍使用原始 WebM，没有新增临时音频文件。

代理向极速版接口发送 JSON，包含 `user.uid`、`audio.data`（WAV Base64）和 `request.model_name: bigmodel`，并启用标点、按需请求分段。请求 ID 作为临时 uid，不包含凭据。

成功必须同时满足 HTTP 成功及 `X-Api-Status-Code: 20000000`。失败仅向用户暴露固定中文提示、HTTP 状态码和经过校验的数字服务码，不回传原始响应体或自由文本响应头。内存由 JavaScript 垃圾回收管理，不承诺立即安全擦除。

参考：https://www.volcengine.com/docs/6561/1631584

验证：`tests/transcription.test.js` 覆盖 WAV 编码、请求格式、错误脱敏和业务状态判断；模拟响应测试不代表真实账号鉴权或识别通过。真实 WebM 解码、长录音内存占用及供应商时长/大小限制仍需实测；当前没有实现长录音分片。
