# 测试与验证

核对日期：2026-10-12。

## 验证入口

| 命令 | 范围 |
| --- | --- |
| npm test | 自动遍历源码/测试语法、500 行门禁、单元测试 |
| npm run lint | 自动语法/行数检查及 Prettier 格式检查 |
| npm run format | 格式化源码、测试、JSON 和 CI 配置 |
| npm run test:media | 真实 FFmpeg 与合成音视频集成测试 |
| npm run test:smoke | 隐藏 Electron、Windows safeStorage、界面/IPC/本地代理及导入验证 |
| npm run test:smoke -- <app.asar路径> | 对构建包运行相同验证 |
| npm run verify | 顺序执行 lint、单元、媒体、Electron 验证 |
| npm run build | 校验固定媒体组件并生成 Windows x64 portable |

npm test 不自动启动 Electron；完整本地门禁使用 verify。媒体组件缺失时集成测试明确失败，不静默跳过。lint 尚不是 ESLint 语义分析或类型检查。

## 本轮证据

59 项单元测试：原有覆盖及模块注册顺序/全局隔离、录音超限不提交截断内容、无效限制、WAV 分配前保护、任务层超限、快捷键命令/用户手势、媒体锁定哈希。

1 项真实 FFmpeg 集成测试覆盖音频、视频、无音轨拒绝及原文件保护。两个隐藏 Electron 测试覆盖真实 Windows 加密、凭据重载、表单 IPC、代理启停、导入目录、预览、取消、失败保留已保存音频及删除保护。

仅使用合成媒体/凭据和替代上游，没有向云端发送用户录音。受限环境 GPU 子进程不可用，已在普通 Windows 环境完成隐藏窗口验证；结果 dist/smoke/result.json 与 dist/import-smoke/result.json。

固定 FFmpeg 下载、解压、三文件哈希和准备流程已在本机验证成功。构建和新包验证结果见本轮最终追加记录。

## CI 与边界

.github/workflows/verify.yml 使用 Windows、Node.js 24，执行 npm ci、lint、单元、固定 FFmpeg 准备、媒体、Electron、构建及包内 Electron 验证。配置已落地，远端运行需推送后确认。

真实系统声音、操作系统快捷键、真实火山引擎账号权限/质量、长音频内存和实际用户发布包运行仍需专项验收。测试通过不能补充整体产品批准记录。

## 本轮最终验证

2026-10-12：npm run verify 完整通过，59 项单元、1 项真实媒体集成及 2 个隐藏 Electron 测试全部通过；格式、全部脚本语法和 500 行门禁通过。

npm run build -- --config.directories.output=dist/structure-review 通过，生成 dist/structure-review/EchoNote 0.1.1.exe。对新包 app.asar 运行 npm run test:smoke -- dist/structure-review/win-unpacked/resources/app.asar，两项测试均通过。包内导入成功截图已检查，界面无明显布局异常；证据位于 dist/smoke 和 dist/import-smoke。

发布包构建通过不代表真实云端转录已验收，CI 尚未在远端执行。
