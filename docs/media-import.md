# 本地音视频导入与分任务保存

用户已授权导入音视频、视频先提取音频、同时保存音频和文本，并要求每次录制创建以时间戳为主的文件夹。导入采用相同目录结构，保留原文件不动。

## 使用

配置火山引擎凭据和保存目录后，点击“导入音频 / 视频”，一次选择一个文件。支持的选择器扩展名为 MP3、WAV、M4A、AAC、FLAC、OGG、OPUS、WMA、MP4、MOV、MKV、AVI、WEBM、M4V。实际能否解码取决于容器内编码；无音轨、损坏、超时和超限会显示错误。

视频只读取第一条音轨，不上传画面。FFmpeg 在内存中转为 16 kHz 单声道 PCM16 WAV，保存到本次目录后经现有本地代理发送到火山引擎。导入、录音及处理互斥；处理中保存目录和时间选项锁定。

## 保存与删除

每次任务生成本地时间格式目录，例如：

    保存目录/
      2026-10-05_15-30-21-123/
        audio.wav
        transcript.md

导入任务保存转换后的 audio.wav；系统录音保存原始 audio.webm。录音目录时间使用开始录音时刻，导入使用选定文件后的任务时刻，精确到毫秒；相同时间追加 _001 等序号，避免覆盖。

先保存音频再转录。上游失败时保留音频，显示“仅保存音频”；成功后保存 Markdown 并在应用内显示文本。文件提取失败不会生成结果目录；音频写盘失败可能留有未完成目录，界面会显示错误及路径。文本写盘失败可能留下未完成文本，不标记成功。

“打开文件夹”打开本次目录。“删除”仅删除应用在本次目录创建的结果文件，再移除空目录；保留其他手动放入的文件。导入原文件不被复制、覆盖或删除。最近结果仍只在当前运行中保留，没有跨重启历史库；可在保存根目录手动找到此前任务。

## 限制与配置

.env.example 中 MAX_MEDIA_BYTES 默认 2 GiB（输入文件），MAX_AUDIO_BYTES 默认 100 MiB（转换后的完整 WAV），MEDIA_DECODE_TIMEOUT_MS 默认 300000。超限会明确停止，不截断后当作完整文本。现有火山引擎服务自身的时长、额度和权限限制仍适用；未实现自动分段。整段音频会占用内存。

应用退出会终止音频提取子进程。已发往上游的请求仍存在既有取消联动限制；已经保存的音频保留。

## 媒体组件准备与构建

在线 ffmpeg-static 二进制下载超时，本次使用本机既有的 Gyan FFmpeg 7.0.2 静态 Windows 构建，未引入 ffmpeg-static 运行依赖。

从可信来源获取带 bin/ffmpeg.exe、LICENSE、README.txt 的 Windows 静态构建后运行：

    npm run media:prepare -- <FFmpeg解压目录>
    npm run test:media
    npm run build -- --config.directories.output=dist/media-import

准备脚本复制可执行文件、许可证与来源说明，记录版本及 SHA-256 到 vendor/ffmpeg/manifest.json。该生成目录已被 Git 忽略，不应提交二进制。prebuild 校验后，electron-builder 将组件放入 resources/media；开发时从 vendor/ffmpeg 读取。用户端不依赖 PATH 中安装的 FFmpeg。

## 第三方组件

本次 FFmpeg 来源构建说明和 GPL v3 许可证随包保留在 resources/media/README.txt 和 LICENSE；版本及哈希在 manifest.json。构建来源：https://www.gyan.dev/ffmpeg/builds/ ，对应 FFmpeg 源码：https://github.com/FFmpeg/FFmpeg/commit/e3a61e9103 。FFmpeg 命令选项参考：https://ffmpeg.org/ffmpeg.html 。对外再分发时需遵守随附许可证；本次没有修改该二进制。

## 验证

52 项自动测试、语法检查，以及使用合成 MP3/MP4 的真实 FFmpeg 解码测试通过。上游响应在自动测试中被替代，不代表实际火山引擎账号识别成功。打包及 Electron 界面验证结果另记。

包内实测通过：tests/electron-import-smoke.cjs 使用真实内置 FFmpeg、真实本地 HTTP 与替代上游，验证视频提取、时间戳目录、音频及文本、预览、取消、失败保留音频和删除保护。结果 dist/import-smoke/result.json，截图 dist/import-smoke/import-success.png；截图已检查。

最终包 dist/media-import/EchoNote 0.1.0.exe 构建成功，包内全部业务 JavaScript 与当前源码一致。最后新增删除防重入后，52 项自动测试和语法检查通过；再次运行隐藏窗口测试因自动审批额度限制未执行。之前包内完整导入流程测试已通过。
