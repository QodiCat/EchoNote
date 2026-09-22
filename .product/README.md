# EchoNote 产品上下文

本目录保存产品输入、决策、PRD、范围、交付状态和验收记录。

## 当前阶段

当前为 MVP 实现与联调阶段。需求边界已有记录，桌面代码、代理、快捷键与简约界面已经存在，自动测试已建立；真实转录尚无成功验收证据，最近联调停在火山引擎 HTTP 403 / 45000030。

历史文档对首版 PRD 是否批准存在冲突，尚缺统一确认记录。本次不追认整体 PRD 已批准；用户明确要求的快捷键设置和 UI 精简属于单独授权的增量。交付事实见 `phase-1/echonote-v1-delivery-status.md`。

## 文档入口

- `requirements-intake.md`：本轮输入事实、非事实假设和待澄清问题。
- `start-prompt.md`：需求确认、PRD、开发门禁和交付流程。
- `phase-1/echonote-v1-prd.md`：首版需求及验收标准，批准状态不从代码反推。
- `phase-1/echonote-v1-traceability.md`：现有实现与验收缺口。
- `phase-1/recording-shortcuts.md`：开始/结束快捷键增量。
- `phase-1/ui-simplification.md`：界面精简增量。
- `../docs/repository-audit.md`：目录用途和生成残留。

工程事实请查看根目录 `AGENTS.md` 与 `.agents/`，不要在两处重复维护详细内容。
