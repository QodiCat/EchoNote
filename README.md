# EchoNote

Windows 系统声音录音与转录桌面应用，使用 Electron + 原生 HTML/CSS/JS，录音停止后通过本地代理调用火山引擎 STT。

## 开发启动

1. 执行 `npm install` 安装依赖。
2. 若没有 `.env`，复制 `.env.example` 为 `.env`，在本地填写服务配置，不要覆盖已有凭据。
3. 在两个终端分别运行 `npm run proxy:start` 和 `npm run dev`。

开发时应用和代理自动读取项目 `.env`；旧版鉴权字段 `VOLCENGINE_ASR_APP_KEY` 填 APP ID，`VOLCENGINE_ASR_ACCESS_KEY` 填 Access Token。详细说明见 [本地启动](docs/local-development.md)。

## 当前进度

- 支持关闭主窗口后驻留系统托盘；点击托盘恢复，右键菜单退出。后台转录仍依赖代理服务，详见 [后台运行](docs/local-development.md#后台运行)。

- 已有系统音频捕获、停止后转录、WebM/Markdown 保存及删除、可保存的全局开始/结束快捷键。
- 主界面已简化为录音操作、保存设置和最近结果；设置中配置快捷键。
- `npm test`：22 项自动测试通过；`npm run lint`：指定 JavaScript 文件的语法检查通过。自动测试不等于真实音频或桌面验收。
- 最近一次用户联调返回火山引擎 HTTP 403 / 服务码 45000030；服务开通与应用凭据匹配仍待确认，没有后续成功证据。
- 2026-09-23 `npm run build` 通过，生成 `dist/EchoNote 0.1.0.exe`（Windows x64 portable）；真实桌面运行仍待验证。

## 文档入口

- [目录审查与清理建议](docs/repository-audit.md)
- [工程架构](.agents/architecture.md)、[测试现状](.agents/testing.md)、[技术债](.agents/technical-debt.md)、[界面现状](.agents/ui-design.md)
- [产品入口](.product/README.md)、[交付状态](.product/phase-1/echonote-v1-delivery-status.md)
- [代理契约](server/proxy-contract.md)

`.env` 含本地配置，已被 Git 忽略；只提交不含真实凭据的 `.env.example`。录音和转录结果不应进入仓库。
