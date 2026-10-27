# 架构上下文

核对日期：2026-10-12。实现事实不代表整体 PRD 批准或真实云端验收。

## 模块职责

- electron/main.js 是窗口、IPC、配置与生命周期的装配入口；transcription-tasks.js 编排任务，session-store.js 保存和删除结果，preload.js 暴露受限接口。
- src/bootstrap.js 统一初始化界面。renderer.js、import-media.js、settings.js、service-settings.js 通过工厂显式传入依赖，只注册模块时可交换顺序，没有共享 state、$、serviceReady 等隐式应用全局变量。
- electron/recording-shortcuts.js 调用稳定的 echoNoteActions 录音接口，不依赖按钮 ID；保留 Electron 的真实键盘用户手势。设置对话框打开时不开始录音。
- display-media.js 请求实际屏幕来源和系统 loopback，界面停止视频轨道，只录制系统声音。
- local-proxy.js 管理回环 HTTP 代理、动态端口和随机令牌；server/proxy.js 校验请求，volcengine.js 适配火山引擎极速版 APP ID + Access Token。
- service-settings.js 使用 Windows safeStorage 保存凭据到 userData/transcription.env，不回显密钥；shortcuts.js 保存快捷键到 userData/shortcuts.json。

## 音频边界

浏览器 WebM 由 src/audio-format.js 在内存解码，本地导入的多种容器由 media-decoder.js 使用隐藏 FFmpeg 进程读取第一条音轨。保留针对两类输入的实现，统一输出 16 kHz 单声道 PCM16 WAV、MAX_AUDIO_BYTES 限制和后续任务编排；不新增临时音频落盘。

录音按秒收集块，累计压缩音频超过 MAX_AUDIO_BYTES 时停止并明确失败，不提交截断内容。停止后按录音时间预检 WAV 大小，分配 WAV 前再校验实际样本数；主进程任务层也校验原始录音与 WAV。导入另有 MAX_MEDIA_BYTES 和 MEDIA_DECODE_TIMEOUT_MS。

整段音频仍在内存，解码、IPC 和 Base64 有额外副本；大小保护不等于恒定内存或自动分段。

## 数据策略

每次任务创建独立本地时间戳目录，先保存音频再转录；录音保存 audio.webm，导入保存 audio.wav，成功后保存 transcript.md。上游失败保留已保存音频；解码及超限失败发生在保存之前。导入源文件不修改。

删除仅处理当前运行中应用创建的结果文件，非空目录保留；最近结果不跨重启恢复。目录偏好在 localStorage，Markdown 时间选项写保存时刻，不是分段时间戳。本次没有改变存储、传输及删除策略。

开发版读取 .env 非敏感配置并从 .env.example 补齐，打包版只使用随包 .env.example。独立 server/index.js 是调试入口，不能当作已鉴权的对外服务。

config/media-lock.json 固定 FFmpeg 7.0.2 与二进制、许可证、说明文件哈希。准备脚本在执行下载文件前校验，prebuild 复验，组件打包到 resources/media。命令见 docs/media-import.md，证据见 testing.md。
