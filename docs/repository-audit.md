# 目录审计

审计日期：2026-10-12，以当前代码、配置和 Git 跟踪为准。

| 目录 | 职责 |
| --- | --- |
| electron/ | 主进程、IPC 桥、系统集成、业务编排和文件存储 |
| src/ | 原生界面、显式模块初始化、浏览器录音和 WAV 编码 |
| server/ | HTTP 代理、火山引擎适配、调试入口和接口契约 |
| config/ | 环境读取与媒体完整性锁 |
| scripts/ | 工程验证、媒体准备/校验、Electron 测试入口及图标生成 |
| tests/ | 单元、真实媒体集成、隐藏 Electron 验证 |
| docs/ | 开发、运行和审计说明 |
| .agents/ | 当前工程事实和验证边界 |
| .product/ | 产品输入、批准及交付记录 |
| .github/workflows/ | Windows CI 门禁 |

## 生成内容与清理

node_modules/、dist/、vendor/ffmpeg/、vendor/downloads/、.npm-cache/ 都是忽略的生成内容。FFmpeg 可按固定版本准备流程重建；dist 历史产物不代表当前源码。

本次删除项目内字面量 %SystemDrive%/ProgramData/Microsoft/Windows/Caches/ 四个误入数据库，并忽略整个 %SystemDrive%/ 目录。该路径不是系统实际 ProgramData。删除是未提交工作区变更。

Git 当前没有跟踪 dist* 产物；旧审计关于 dist-final/default_app.asar 的结论已失效。本次保留现有发布包及验证证据，不删除 dist/。

.env 保持忽略，.env.example 和 package-lock.json 保留；录音/文本不进入仓库。原始需求、产品记录、工程文档保留。

## 结构修复

源码统一 Prettier 格式，源码/配置/测试有 500 行门禁。界面工厂由 bootstrap 显式装配，没有依赖其他脚本的隐式应用全局变量。详细模块边界见 ../.agents/architecture.md。

getProxyStatus 已由凭据界面使用，不是闲置接口。language 请求头仍不由上游适配器显式控制，不视为已实现语言切换。
