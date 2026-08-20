/**
 * Timeline data is always stored as decimal seconds (see TimelineEvent.time).
 * These helpers only format for display — never treat the formatted string
 * as a source of truth.
 */
export function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  const millis = Math.round((safe - Math.floor(safe)) * 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(
    millis,
  ).padStart(3, '0')}`;
}

/** Parses "mm:ss.mmm" back into decimal seconds. Returns null if malformed. */
export function parseTime(formatted: string): number | null {
  const match = /^(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/.exec(formatted.trim());
  if (!match) return null;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const millis = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
  return minutes * 60 + seconds + millis / 1000;
}
