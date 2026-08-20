export const PEAKS_PER_SECOND = 12;

/**
 * Downsamples a decoded AudioBuffer's peaks to a fixed density
 * (PEAKS_PER_SECOND) rather than one-per-sample, so a multi-minute track
 * still produces a small, JSON-friendly array to store on
 * AudioConfig.waveformPeaks. Takes an already-decoded buffer — importing a
 * track decodes it once via audioEngine.loadFromArrayBuffer, and this
 * reuses that result instead of decoding the file a second time.
 */
export function computePeaksFromBuffer(audioBuffer: AudioBuffer): number[] {
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

  return peaks;
}
