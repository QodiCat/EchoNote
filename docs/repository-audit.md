# 目录审查

审查日期：2026-09-22。基于当前文件、引用、package.json、Git 跟踪状态和本轮测试，不将文件存在视为功能验收。

## 可以清理的生成残留

| 位置 | 当前内容 | 结论 |
| --- | --- | --- |
| `dist/` | builder-effective-config.yaml 和 win-unpacked.tmp/resources/default_app.asar，约 0.10 MiB | 构建生成物；当前没有完整发布包，源码运行不依赖它 |
| `dist-build/` | win-unpacked.tmp/resources/default_app.asar，约 0.10 MiB | 旧构建临时残留；当前 npm 构建脚本没有指定此目录 |
| `dist-final/` | win-unpacked.tmp/resources/default_app.asar，约 0.10 MiB | 旧构建临时残留；其中 asar 已被 Git 跟踪 |

本轮只检查和记录，没有删除构建目录或修改 Git 索引。已补充忽略 `dist-final/`，但忽略规则不会取消已跟踪文件；后续清理还应移除该资源文件的版本控制记录。这三处合计约 0.31 MiB，无需为了节省空间急于清理。

## 应保留的内容

- `electron/`、`src/`、`server/`、`config/`：分别承载桌面主进程、界面、代理及环境配置。通过入口、脚本标签、require 或测试引用，未发现明显闲置源码模块。
- `tests/`：5 个文件、19 项测试，覆盖捕获、环境配置、录音状态、快捷键和转录适配。
- `node_modules/`：可重装的开发依赖，不是业务源码，但当前启动和构建需要；已忽略。
- `.env`：本地配置，未跟踪且已忽略；`.env.example` 和 package-lock.json 是应保留的配置模板与依赖锁定文件。
- `基础沟通需求.md`：原始需求依据，保留；`.product/` 是产品记录，`.agents/` 是工程上下文，不属于无用文件。
- `echonote-v1-schedule-quote.md`：尚未填写的商务占位文档，不参与运行；保留原有流程入口，不虚构报价或工期。
- `docs/recording-capture.md`：捕获错误修复背景；`docs/local-development.md`：启动说明，均有实际用途。
- `.git/`：版本历史，必须保留。

## 当前未使用的接口与字段

- `electron/preload.js` 暴露的 `getProxyStatus` 及 main.js 的 `get-proxy-status` 没有界面调用者；可在后续接入真实状态提示或移除，本轮未改业务代码。
- `server/index.js` 读取并传递 `language`，但 `volcengine.js` 没有接收或使用该参数；当前依赖上游自动识别。该透传字段目前没有实际效果，调整接口时应同步契约。

## 文档更新

已将“仅需求初始化”“研发未开始”“测试仅语法检查”等过时阶段描述更新为实现事实；全局 PRD 批准记录仍有历史冲突，不能据已有代码认定已批准。快捷键和 UI 精简有本轮明确用户请求，单独记录授权范围。

下一步先解决上游 403，再验证真实录音、转录、保存、删除及后台快捷键，最后验证 portable 构建。暂不宣称已经完成客户验收。
