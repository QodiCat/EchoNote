# 系统声音捕获修复

`setDisplayMediaRequestHandler` 的 request 没有 `video` 来源对象；将其直接传给 callback 会导致 `video must be a WebFrameMain or DesktopCapturerSource`。

现在通过 `desktopCapturer.getSources` 获取屏幕来源，将实际来源对象与 `audio: 'loopback'` 传给回调。渲染层仍立即停止视频轨道，仅将音频轨道交给 MediaRecorder，不保存屏幕视频。

无屏幕来源或枚举失败时以空对象拒绝捕获，由现有录音界面显示失败。枚举异常仅记录固定消息。

`npm test` 增加有效来源、空来源和枚举异常的回归测试。这些测试不替代 Windows 真实系统声音录制验证，也不代表火山引擎转录链路已通过验收。

手工验证：重启桌面应用，播放非敏感语音并开始录音，确认进入录音状态且没有主进程 TypeError；停止后检查转录结果。没有播放声音不等同于没有音频轨道，静音检测仍待验证。
