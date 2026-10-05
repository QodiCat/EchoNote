# 测试与验证

## 本轮结果（2026-09-22）

执行 npm test：19 项通过。执行 npm run lint：通过，当前仅检查 package.json 中列出的 JavaScript 语法，并非完整静态分析。

| 测试文件 | 项数 | 覆盖 |
| --- | --- | --- |
| display-media.test.js | 3 | 有效来源、空来源、枚举异常 |
| env.test.js | 2 | 白名单、环境优先级、缺失文件与读取异常 |
| recording-state.test.js | 2 | 连续开始/停止防重入、转录中不新建任务、失败恢复 |
| shortcuts.test.js | 5 | 校验、冲突、保存失败回滚、重启恢复、注销 |
| transcription.test.js | 7 | WAV 编码、JSON 请求、状态码、错误脱敏、异常响应 |

这些测试使用替代依赖或模拟响应，不是真实系统声音、操作系统快捷键或火山引擎识别验收。

## 实际联调证据

用户确认已启动试用界面，并提供过转录调用报错。最近一次为 HTTP 403 / 45000030；尚无成功转录、保存或删除的用户证据。旧记录称代理健康检查通过，本轮未复测。

UI 已精简；上轮 Browser 连接没有可用浏览器，未完成视觉检查。存在 dist* 临时资源不代表构建成功。本轮未运行 npm run build。未发现 CI 配置。

## 尚需验证

- Windows 10+ 系统声音采集、无麦克风采集、静音与权限失败。
- 开始、停止、处理中、成功和失败状态；后台快捷键与弹窗行为。
- 中文/英文与标点，真实上游成功响应、超时和网络断开。
- 同一目录写入 WebM/Markdown、重启恢复目录、时间选项实际语义。
- 磁盘不足、文件冲突、部分保存与部分删除的可见反馈和恢复。
- 长录音限制、代理中断、部署日志和数据不持久化约束。
- Windows x64 portable 构建及独立运行；不包含自动更新。

验收目标见 .product/phase-1/echonote-v1-prd.md；未通过的项目不得记为完成。

## 2026-10-05 增量验证

30 项自动测试和扩展语法检查通过。新增代理真实本机 HTTP 启停、动态凭据、鉴权、413、错误脱敏测试；凭据存储接口替身的持久化/恢复/损坏/保存失败测试；未配置禁止录音。npm run build 的原输出目录因 EPERM 无法替换，改用 --config.directories.output=dist/managed-proxy 构建通过。包内含代理和 .env.example，不含 .env。真实 safeStorage 与界面由 tests/electron-smoke.cjs 单独验证，结果另记。真实音频和火山引擎账号仍待验收。

最终实测：Electron 隐藏窗口读取构建后的 app.asar，真实 Windows safeStorage 加密、凭据重载、设置表单 IPC、输入清空、代理启动/关闭均通过。仅使用合成凭据，不发送音频。截图 dist/smoke/settings.png 已检查，结果 dist/smoke/result.json。受限环境 GPU 子进程失败后，在普通 Windows 环境验证通过。真实系统录音和云端转录仍待验收。

2026-10-05 打开文件夹增量：34 项自动测试和语法检查通过。新增中文/空格目录、无结果、目录移动、shell 返回错误或抛错、界面错误反馈和按钮恢复测试。系统打开使用替代依赖，Windows 资源管理器真实显示尚未验收。

媒体导入准备：新增 5 项 media-decoder.test.js 测试；media-decoder.integration.cjs 用本机 FFmpeg 和合成 MP3/MP4 验证真实解码、无音轨拒绝和原文件不变，1 项通过。集成测试通过 ECHONOTE_TEST_FFMPEG 指定测试二进制，不使用真实用户媒体或调用云端。导入 UI 和持久化行为待数据策略确认后接入。

## 导入功能最终验证

52 项 npm test、npm run lint、1 项 npm run test:media 通过。新增时间戳冲突、音频/文本同目录、失败留音频、仅删除生成文件、导入录音互斥和删除期间防重入。tests/electron-import-smoke.cjs 在隐藏离屏 Electron 中加载包内代码与真实 FFmpeg，验证 UI/IPC/本地代理、音视频保存、预览、目录路由、取消、上游失败及原文件保护，结果通过且截图已检查。上游为替代响应，不能视为真实云端识别验收。
