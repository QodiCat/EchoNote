# EchoNote

Windows 系统声音录音与转录桌面应用，使用 Electron + 原生 HTML/CSS/JS，录音停止后通过本地代理调用火山引擎 STT。

## 开发启动

1. 执行 `npm install` 安装依赖。
2. 执行 `npm run dev`，桌面应用会自动管理本地转录代理，无需另开代理终端。
3. 打开“设置”，填写火山引擎录音文件识别极速版的 APP ID 和 Access Token，点击“保存转录凭据”。凭据使用 Windows 加密能力保存，不回显。
4. 选择保存目录，主动开始录音，停止后发送到火山引擎转录。

打包版双击 exe 即可启动，无需安装 Node.js 或手动配置项目 .env。详见 [本地启动](docs/local-development.md)。

## 当前进度

- 2026-10-05：桌面自动管理本地代理，设置中加密保存 APP ID / Access Token。30 项测试、语法检查和包内界面/Windows 加密验证通过；新包为 `dist/managed-proxy/EchoNote 0.1.0.exe`。

- 支持关闭主窗口后驻留系统托盘；点击托盘恢复，右键菜单退出。后台转录仍依赖代理服务，详见 [后台运行](docs/local-development.md#后台运行)。

- 已有系统音频捕获、停止后转录、WebM/Markdown 保存及删除、可保存的全局开始/结束快捷键。
- 主界面已简化为录音操作、保存设置和最近结果；设置中配置快捷键。
- `npm test`：22 项自动测试通过；`npm run lint`：指定 JavaScript 文件的语法检查通过。自动测试不等于真实音频或桌面验收。
- 最近一次用户联调返回火山引擎 HTTP 403 / 服务码 45000030；服务开通与应用凭据匹配仍待确认，没有后续成功证据。
- 2026-09-23 `npm run build` 通过，生成 `dist/EchoNote 0.1.0.exe`（Windows x64 portable）；真实桌面运行仍待验证。

## 文档入口

- [应用图标与资源生成](docs/app-icon.md)

- [目录审查与清理建议](docs/repository-audit.md)
- [工程架构](.agents/architecture.md)、[测试现状](.agents/testing.md)、[技术债](.agents/technical-debt.md)、[界面现状](.agents/ui-design.md)
- [产品入口](.product/README.md)、[交付状态](.product/phase-1/echonote-v1-delivery-status.md)
- [代理契约](server/proxy-contract.md)

`.env` 含本地配置，已被 Git 忽略；只提交不含真实凭据的 `.env.example`。录音和转录结果不应进入仓库。

## 本地文件导入与独立文件夹

点击“导入音频 / 视频”转录本地文件；视频先提取音频。录音和导入分别创建时间戳文件夹，保存音频与 Markdown，转录失败时保留已保存的音频。详细使用、媒体组件准备和验证说明见 [媒体导入](docs/media-import.md)。
