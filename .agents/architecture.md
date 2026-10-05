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

## 2026-10-05 本地代理与凭据更新

本段更新此前的独立代理和打包配置描述：桌面主进程内的 electron/local-proxy.js 自动管理 server/proxy.js，回环监听、动态端口和随机令牌；退出关闭服务和连接。server/index.js 保留独立调试入口。electron/service-settings.js 使用 safeStorage 加密凭据到 userData/transcription.env，状态接口不返回密钥；src/service-settings.js 提供用户输入。开发版读取 .env 的非敏感配置，打包版读取随包 .env.example。桌面不导入项目 .env 中的旧凭据。录音及文本数据流和落盘策略不变。

2026-10-05：新增 electron/result-folder.js。主进程记录最近成功保存的文件路径，open-result-folder IPC 不接收任意路径参数；校验目录后调用 shell.openPath。最近结果删除后清除记录，渲染器隐藏入口。

2026-10-05 媒体导入进行中：electron/media-decoder.js 为独立模块，通过隐藏 FFmpeg 子进程仅提取第一条音轨为 16kHz 单声道 PCM，再构造有准确长度的 WAV。设输入/输出大小上限、超时和退出终止；当前未接入主进程或 UI。依赖安装下载超时，现有本机 FFmpeg 仅用于合成媒体测试；不表示新功能完成。

## 2026-10-05 导入与分任务保存已接入

用户确认保存音频与文本，录音及导入都创建本地时间戳独立目录；相同时间自动加序号。electron/session-store.js 管理生成文件，先音频后文本；录音 WebM、导入转换后 WAV；上游失败保留已保存音频。electron/transcription-tasks.js 串行编排本地选择、提取、保存、转录，主进程只保存受控结果引用；删除不接受渲染器任意路径，不触及导入源文件。src/import-media.js 处理阶段提示，renderer 显示文本和音频-only结果。

媒体组件来自本机已验证的 Gyan FFmpeg 7.0.2 静态构建；media:prepare 准备到被忽略的 vendor/ffmpeg，prebuild 验证哈希及许可证，extraResources 打包到 resources/media。用户端不需另装 FFmpeg。在线 ffmpeg-static 下载失败的准备方案已替换。未实现长媒体自动分段，退出终止 FFmpeg；上游断连取消仍是既有缺口。
