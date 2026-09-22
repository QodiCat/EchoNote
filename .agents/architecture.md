# 架构上下文

核对日期：2026-09-22。实现事实不代表产品批准或验收完成。

## 当前实现

- Electron + 原生 HTML/CSS/JS。electron/main.js 负责窗口、IPC、目录选择、本地 WebM/Markdown 保存与删除、代理请求和全局快捷键入口；preload.js 暴露受限接口。
- electron/display-media.js 从 desktopCapturer 获取实际屏幕来源并请求 loopback 系统音频；renderer.js 立即停止视频轨道，仅录制音频。
- src/renderer.js 管理 idle/starting/recording/processing 状态，防止重复启动；录音结束后才提交转录。
- src/audio-format.js 在内存中把 WebM 解码为 16 kHz 单声道 PCM16 WAV；server/volcengine.js 以 Base64 JSON 提交极速版接口，校验 HTTP 与服务状态码。
- server/index.js 提供 GET /health 和 POST /v1/transcriptions；代理使用 APP ID + Access Token，尚无新版 API Key 鉴权支持。契约见 server/proxy-contract.md。
- config/env.js 只加载指定环境字段，已有进程环境优先。开发桌面端只从文件读取代理地址，代理读取服务配置；打包版不自动加载项目 .env。
- electron/shortcuts.js 负责全局开始/结束快捷键的校验、注册、冲突回滚与本地保存；src/settings.js 提供设置界面。

## 数据与边界

目标平台 Windows 10+，只捕获系统声音，不提供麦克风入口和录制中转录。数据流为系统声音 → 内存 WebM → 内存 WAV → 代理 → 火山引擎 → 文本。成功后在用户目录保存原始 WebM 和 Markdown；失败后结束本次流程，没有自动重试或失败录音落盘。

目录偏好保存在渲染器 localStorage，快捷键保存在 userData/shortcuts.json。最近结果仅在当前进程内存，不提供历史列表。Markdown 当前时间选项写入保存时的本地时刻，没有把上游分段时间戳写入正文。

代理代码不主动将音频/文字写入磁盘，内存由垃圾回收管理；尚未验证操作系统、崩溃转储和部署链路的数据保留行为，不能宣称立即安全擦除。

## 待完善

火山引擎真实权限联调、代理访问控制与部署、请求取消、长录音内存和大小限制、文件冲突/部分保存/部分删除恢复，以及 portable 代理配置与实际构建。具体风险见 technical-debt.md。
