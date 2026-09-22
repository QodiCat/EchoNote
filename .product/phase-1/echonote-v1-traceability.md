# EchoNote v1 · PRD 版本 0.1

## UI 资产清单

当前 UI 实现位于 `src/index.html`、`src/styles.css`、`src/settings.css`。实现存在不代表整体设计或 PRD 已批准。快捷键和 UI 精简分别有明确用户增量请求；最终视觉验收仍待完成。

## 追踪矩阵

| 功能 ID | UI | 路由/页面 | 前端 | 后端/API | 数据 | 测试 | `.agents` |
|---|---|---|---|---|---|---|---|
| P1-01 | 录音卡片 | index.html | renderer.js | display-media.js / loopback | 内存 WebM | 捕获与状态自动测试；AC-01 真实音频待验 | architecture/testing |
| P1-02 | 转录状态与错误 | index.html | renderer.js / audio-format.js | main.js → server/index.js → volcengine.js | WAV → Base64 JSON；真实结果 | 请求格式/错误测试；AC-02 等真实转录被 403 阻断 | architecture/testing |
| P1-03 | 保存设置与结果路径 | index.html | renderer.js | main.js save-recording | WebM + Markdown；目前只写保存时刻 | AC-03、AC-04 待验；分段时间戳未用于导出 | architecture/testing |
| P1-04 | 删除按钮与确认 | index.html | renderer.js | main.js delete-recording | 同时发起两个文件删除 | AC-07 待验；部分成功恢复未完善 | architecture/testing |
| P1-05 | 目录与快捷键设置 | index.html / settings.js | renderer.js / settings.js | main.js / shortcuts.js | localStorage 目录；userData/shortcuts.json | 快捷键自动测试；AC-08、AC-09 待验；本期无自动更新 | architecture/testing |

## 增量与证据

- `recording-shortcuts.md`：全局开始/结束快捷键，已实现格式校验、占用错误、保存回滚与重启加载；真实按键待验。
- `ui-simplification.md`：用户要求去除介绍和装饰，已实现单栏操作界面；浏览器不可用，未完成视觉检查。
- 自动测试共 19 项通过，详见 `.agents/testing.md`。矩阵中的验收 ID 是目标，不是通过证明。
