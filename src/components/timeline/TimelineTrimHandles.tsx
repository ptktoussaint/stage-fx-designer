import { useCallback, useRef } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { setAudio } from '../../commands';
import './TimelineTrimHandles.css';

interface TimelineTrimHandlesProps {
  pxPerSecond: number;
  height: number;
  duration: number;
}

const MIN_GAP_SECONDS = 0.2;

/**
 * Drag handles over the waveform to trim the start/end of playback. This
 * never re-encodes the audio file — see AudioConfig.trimStart/trimEnd —
 * dragging a handle just narrows the [trimStart, trimEnd) window the
 * playback engine plays and auto-stops at, and it's always reversible by
 * dragging back out to the edges.
 */
export function TimelineTrimHandles({ pxPerSecond, height, duration }: TimelineTrimHandlesProps) {
  const trimStart = useProjectStore((s) => s.project.audio.trimStart) ?? 0;
  const trimEnd = useProjectStore((s) => s.project.audio.trimEnd) ?? duration;
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(
    (which: 'start' | 'end') => (e: React.PointerEvent) => {
      e.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      const originX = rect?.left ?? 0;

      const onMove = (ev: PointerEvent) => {
        const time = Math.max(0, Math.min(duration, (ev.clientX - originX) / pxPerSecond));
        const audio = useProjectStore.getState().project.audio;
        const currentEnd = audio.trimEnd ?? duration;
        if (which === 'start') {
          setAudio({ trimStart: Math.min(time, currentEnd - MIN_GAP_SECONDS) });
        } else {
          const clampedEnd = Math.max(time, audio.trimStart + MIN_GAP_SECONDS);
          setAudio({ trimEnd: clampedEnd >= duration - 0.05 ? null : clampedEnd });
        }
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [pxPerSecond, duration],
  );

  return (
    <div ref={containerRef} className="timeline-trim-handles" style={{ height }}>
      <div
        className="timeline-trim-handles__handle timeline-trim-handles__handle--start"
        style={{ left: trimStart * pxPerSecond }}
        onPointerDown={handlePointerDown('start')}
        title={`Trim start: ${trimStart.toFixed(2)}s`}
      />
      <div
        className="timeline-trim-handles__handle timeline-trim-handles__handle--end"
        style={{ left: trimEnd * pxPerSecond }}
        onPointerDown={handlePointerDown('end')}
        title={`Trim end: ${trimEnd.toFixed(2)}s`}
      />
    </div>
  );
}
