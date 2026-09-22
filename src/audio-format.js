function encodeMonoWav(audioBuffer) {
  const samples = audioBuffer.length;
  const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, i) => audioBuffer.getChannelData(i));
  if (!samples || !channels.length) throw new Error('录音内容为空，请重新录制');
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const writeText = (offset, value) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeText(0, 'RIFF');
  view.setUint32(4, buffer.byteLength - 8, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, audioBuffer.sampleRate, true);
  view.setUint32(28, audioBuffer.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) {
    const average = channels.reduce((sum, channel) => sum + channel[i], 0) / channels.length;
    const sample = Math.max(-1, Math.min(1, average));
    view.setInt16(44 + i * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  return buffer;
}

async function recordingToWav(buffer) {
  // Decoding resamples to the context's sample rate; nothing is played or saved.
  const context = new OfflineAudioContext(1, 1, 16000);
  let decoded;
  try {
    decoded = await context.decodeAudioData(buffer.slice(0));
  } catch {
    throw new Error('无法解码本次录音，请重新录制');
  }
  return encodeMonoWav(decoded);
}

if (typeof module !== 'undefined') module.exports = { encodeMonoWav, recordingToWav };
