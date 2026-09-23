# 本地启动

先运行 `npm install`。没有 `.env` 时从 `.env.example` 复制；已有 `.env` 不要覆盖。

在项目根目录的 `.env` 填写配置，然后分别在两个终端运行：

```powershell
npm run proxy:start
```

```powershell
npm run dev
```

开发版桌面应用自行从项目根目录 `.env` 加载 `ECHONOTE_PROXY_URL`；代理加载端口、请求大小和火山引擎相关配置。已有环境变量优先；缺少配置时仍由业务流程明确报错。读取文件遇到权限等异常时不静默忽略。

加载器只读取各进程允许的配置项，不从文件加载 Node/Electron 运行开关。桌面应用不从文件加载火山引擎密钥；`.env` 不属于打包文件。打包版的代理地址配置仍需另行完善。

无需通过 `node --env-file` 启动 Electron。`npm test` 覆盖配置白名单、环境变量优先级、文件缺失和读取异常；图形窗口与真实转录需要手工验证。

## 凭据与联调

- 当前代理使用旧版语音控制台鉴权：`VOLCENGINE_ASR_APP_KEY` 对应 APP ID，`VOLCENGINE_ASR_ACCESS_KEY` 对应同一应用的 Access Token，不是 Secret Key。
- 默认资源为 `volc.bigasr.auc_turbo`，必须与应用开通的极速版服务匹配。代码尚未提供新版 `X-Api-Key` 鉴权。
- 最近用户反馈 HTTP 403 / 45000030；凭据/资源权限未确认解决，不能据此宣称已经转录成功。
- 修改代理环境配置后，停止旧代理并重新运行 `npm run proxy:start`；不要将密钥、原始请求体或转录内容放入排错日志。

## 快捷键与验证

右上角“设置”中输入开始和结束快捷键，例如 `Ctrl+Alt+R` 和 `Ctrl+Alt+S`；保存后全局生效，留空保存关闭。配置保存在 Electron userData 下的 shortcuts.json。打开设置时开始快捷键不会触发录音。

`npm test` 包含后台窗口生命周期回归测试；`npm run lint` 为语法检查，不是完整风格或静态分析。`npm run build` 配置 Windows x64 portable。不要将 `dist*` 临时文件作为完整发布产物。

## 后台运行

关闭主窗口会隐藏到系统托盘，保留正在运行的录音和转录任务；最小化或隐藏时禁用渲染器后台计时限速。点击托盘图标或菜单“显示主窗口”可返回；全局快捷键仍按原行为唤起窗口。右键托盘选择“退出 EchoNote（结束当前任务）”才会退出，未完成任务会随进程结束。

后台驻留不等于脱离开发终端或自动托管代理。开发时仍需运行应用和代理；portable 应用也需要可访问的转录代理。本次不增加开机启动或 Windows 服务。

2026-09-23：`npm test` 的 22 项测试及 `npm run lint` 通过。自动测试覆盖关闭隐藏、托盘恢复、显式退出和资源清理。真实 Windows 托盘显示、隐藏后持续录音及转录保存仍需桌面验证，不能由模拟测试替代。

同日 `npm run build` 成功生成 `dist/EchoNote 0.1.0.exe`，包含本次后台驻留修复。构建通过不代表真实录音或转录验收通过。
