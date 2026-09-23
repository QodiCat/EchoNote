# EchoNote 应用图标

2026-09-23 用户要求替换为适合应用的美观图标。本次采用深绿底色、浅色声波与折角笔记的组合，表示系统声音转为文字。使用内置 image_gen 生成，原图透明区域保留；没有调用 API 或使用密钥。

资源位于 `src/assets/`：`echonote-source.png` 为生成原图，`echonote.png` 为 256px 界面资源，`echonote-tray.png` 为 32px 托盘资源，`echonote.ico` 包含 16/24/32/48/64/128/256px 七种尺寸。程序文件、窗口、托盘、页面图标和左上角标识统一使用这套资源。

修改原图后可用 `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-icons.ps1` 重新生成尺寸和 ICO，再运行 `npm run build`。此脚本只进行尺寸转换和封装，不重新生成设计。

## 生成提示词

验证：22 项自动测试、语法检查通过；PNG 角落 alpha 为 0；ICO 七个尺寸帧结构检查通过。Windows portable 构建成功，已从生成的程序文件提取图标并目视核对为新标识。尚未启动新版进行桌面 UI 验收。

Use case: logo-brand. Asset type: production Windows desktop application icon for EchoNote, a system-audio recorder that turns sound into written notes. Create ONE polished square app icon, not a presentation or mockup. A forest-green rounded square tile with a bold ivory-white central symbol elegantly combining an audio waveform and a folded note sheet. Minimal, distinctive, calm productivity software aesthetic, flat vector-like precision with only a very subtle green tonal gradient. Match a quiet interface using dark green #28352c and sage #b5de9b. Strong simple silhouette, generous but not excessive internal spacing, very few shapes, thick strokes, instantly legible at 16 and 32 pixels. Tile fills about 90% of square canvas. Straight-on orthographic. Transparent background outside the rounded square, real alpha, no surrounding white canvas. No text, no lettering, no microphone, no headphones, no detailed sound waves, no 3D perspective, no decorative objects, no external drop shadow, no watermark. Deliver a single high-resolution square PNG icon.
