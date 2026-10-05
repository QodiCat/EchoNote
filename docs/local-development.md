# 本地启动

运行 `npm install` 安装依赖，然后运行 `npm run dev`。桌面主进程自动启动本地 HTTP 转录代理，不再需要第二个终端。

## 用户配置

打开“设置” → “火山引擎转录”，填写同一应用的 APP ID 和 Access Token（不是 Secret Key），保存后立即生效。需要开通录音文件识别极速版服务。当前沿用 APP ID + Access Token 鉴权，不支持新版单一 API Key。

凭据由 Electron safeStorage 加密后存入 userData/transcription.env，受当前 Windows 用户保护。界面不回显已保存凭据；更换时重新填写两项。加密不可用、文件损坏或保存失败会显示错误，不写明文或默认成功。录音/转录期间界面禁止修改凭据。

未配置凭据时阻止开始录音。保存仅验证输入及本地存储，不代表上游鉴权已通过；服务权限在真实转录时验证。之前的 HTTP 403 / 45000030 尚无解决证据。

## 配置与独立代理

默认非敏感配置集中在 .env.example，并随应用打包。开发桌面端从项目 .env 加载非敏感配置；打包版使用 .env.example。桌面端不自动导入项目 .env 的旧凭据，需在设置界面保存一次。

内置代理仅监听 127.0.0.1，由系统分配空闲端口，使用每次启动生成的随机令牌验证请求。端口 0 是动态分配策略，不使用固定业务端口；ECHONOTE_PROXY_URL 仅作本地 URL 模板，实际主机和端口由管理器替换，不支持远程代理模式。

开发者仍可单独运行 `npm run proxy:start`，用于接口调试。该模式从 .env 读取凭据、PORT 等，再从 .env.example 补充默认项；进程环境优先。独立代理不被桌面程序使用，不具备内置代理的随机令牌，不应对外部署。

## 打包

`npm run build` 生成 Windows x64 portable exe，包含 Electron、代理代码和非敏感配置，不包含项目 .env、用户凭据或录音。使用者无需安装 Node.js。原构建目录被占用时，可运行 `npm run build -- --config.directories.output=dist/managed-proxy` 使用独立输出目录。

## 快捷键与后台运行

在设置中保存开始和结束快捷键，例如 Ctrl+Alt+R、Ctrl+Alt+S；留空保存关闭。快捷键保存在 userData/shortcuts.json。

关闭主窗口会隐藏到托盘，录音、转录和本地代理继续运行；右键托盘选择“退出 EchoNote（结束当前任务）”才会退出，同时关闭本地代理。未完成任务随进程退出结束。没有新增开机启动、Windows 服务或自动更新。

## 验证

`npm test` 验证代理生命周期、访问控制、凭据存储及既有录音和转录逻辑。`npm run lint` 为语法检查。tests/electron-smoke.cjs 可由 Electron 运行，传入构建后的 app.asar 路径，使用合成凭据验证真实 safeStorage 和设置界面 IPC；输出位于 dist/smoke。

真实系统声音、火山引擎服务权限、完整录音到保存流程仍需用户桌面验收，不能由测试或构建通过代替。

2026-10-05 最终验证：30 项自动测试与语法检查通过；独立目录 Windows x64 portable 构建通过，产物 dist/managed-proxy/EchoNote 0.1.0.exe。Electron 隐藏窗口读取包内 app.asar，验证设置表单 IPC、真实 Windows safeStorage 加密/重新读取、输入清空及代理启停通过；截图已检查，结果位于 dist/smoke/result.json。受限环境图形子进程失败后，在普通 Windows 执行环境通过。仅用合成凭据，没有发送音频到云端。真实录音到转录保存仍待用户验收。
