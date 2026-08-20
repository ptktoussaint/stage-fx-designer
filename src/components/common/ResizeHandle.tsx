import { useCallback, useRef } from 'react';
import './ResizeHandle.css';

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onResize: (deltaPx: number) => void;
}

/** Thin draggable strip used by the sidebar/inspector/timeline panels to resize. */
export function ResizeHandle({ direction, onResize }: ResizeHandleProps) {
  const lastPos = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      lastPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const pos = direction === 'horizontal' ? ev.clientX : ev.clientY;
        onResize(pos - lastPos.current);
        lastPos.current = pos;
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [direction, onResize],
  );

  return (
    <div
      className={`resize-handle resize-handle--${direction}`}
      onPointerDown={onPointerDown}
    />
  );
}
