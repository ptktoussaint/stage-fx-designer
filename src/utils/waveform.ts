export const PEAKS_PER_SECOND = 12;

/**
 * Decodes an audio file into { duration, peaks }. Peaks are downsampled to
 * a fixed density (PEAKS_PER_SECOND) rather than one-per-sample so a
 * multi-minute track still produces a small, JSON-friendly array to store
 * on AudioConfig.waveformPeaks.
 */
export async function decodeAudioForWaveform(
  file: File,
): Promise<{ duration: number; peaks: number[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioContextCtor();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const peakCount = Math.max(1, Math.round(audioBuffer.duration * PEAKS_PER_SECOND));
    const samplesPerPeak = Math.max(1, Math.floor(channelData.length / peakCount));
    const peaks: number[] = [];

    for (let i = 0; i < peakCount; i++) {
      const start = i * samplesPerPeak;
      const end = Math.min(start + samplesPerPeak, channelData.length);
      let max = 0;
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) max = abs;
      }
      peaks.push(max);
    }

    return { duration: audioBuffer.duration, peaks };
  } finally {
    void audioContext.close();
  }
}
