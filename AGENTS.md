# EchoNote 工程指南

## 项目简介

EchoNote 是规划中的 Windows 桌面端实时录音转录软件：用户主动开始后读取电脑播放的音频，停止后将音频处理为文本，并支持保存为 Markdown。

当前仓库已进入 UI 优先的 MVP 开发阶段，采用 Electron + 原生 HTML/CSS/JS；火山引擎 STT 通过服务端代理接入。

## 事实来源

- 代码、配置、测试和 CI 说明当前实现事实。
- `.product/` 保存产品输入、决策、PRD 与交付状态；未批准内容不得授权开发。
- `.agents/` 保存工程事实，不替代产品决策。
- 文档与实现冲突时分别记录，不用代码倒推需求已完成。

## 工程命令

- 安装：`npm install`
- 开发：`npm run dev`
- 测试：`npm test`
- Lint：`npm run lint`
- 构建：`npm run build`

不得猜测命令；只有建立并验证对应配置后才能补充。

## 全局约束

- 单个可维护源码、配置或测试文件原则上不超过 500 行。
- 一个目录只负责一个领域；先复用已有能力，不创建重复模块。
- 配置使用 `.env` / `.env.example`，禁止硬编码密钥、Token、URL 和端口。
- 不使用长期 Mock、静默降级、吞异常或默认成功掩盖问题。
- 修改功能时同步更新测试和相关上下文文档，不删除测试或绕过 CI。
- 原始录音与转录文本属于敏感数据，存储、传输、保留和删除策略须先获确认。
- 产品范围、技术选型和验收标准在人工确认前均不得视为批准。

## 上下文索引

- `.agents/architecture.md`：架构事实与待决技术边界。
- `.agents/testing.md`：验证现状与质量门槛。
- `.agents/technical-debt.md`：当前缺口与风险。
- `.agents/ui-design.md`：当前 UI 设计阶段、边界、门禁和产物。
- `.product/README.md`：产品入口与阶段。
- `.product/requirements-intake.md`：本轮需求事实、假设与待澄清项。
- `.product/start-prompt.md`：产品工作与开发门禁。

## 完成标准

只有在目标明确、PRD 获得人工批准、实现与测试完成、验收证据真实且上下文同步后，功能才算完成。
