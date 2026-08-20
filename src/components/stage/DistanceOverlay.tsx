import { computeDistance } from '../../utils/math';
import type { DeviceInstance } from '../../types';

interface DistanceOverlayProps {
  a: DeviceInstance;
  b: DeviceInstance;
  screenA: { x: number; y: number };
  screenB: { x: number; y: number };
}

/** Shown when exactly two devices are selected with the Distance tool active. */
export function DistanceOverlay({ a, b, screenA, screenB }: DistanceOverlayProps) {
  const distance = computeDistance(a.position, b.position);
  const midX = (screenA.x + screenB.x) / 2;
  const midY = (screenA.y + screenB.y) / 2;

  return (
    <g pointerEvents="none">
      <line x1={screenA.x} y1={screenA.y} x2={screenB.x} y2={screenB.y} stroke="var(--warning)" strokeWidth={1.5} strokeDasharray="5 3" />
      <line x1={screenA.x} y1={screenA.y} x2={screenB.x} y2={screenA.y} stroke="var(--text-muted)" strokeWidth={1} strokeDasharray="2 2" />
      <line x1={screenB.x} y1={screenA.y} x2={screenB.x} y2={screenB.y} stroke="var(--text-muted)" strokeWidth={1} strokeDasharray="2 2" />

      <g transform={`translate(${midX} ${midY - 10})`}>
        <rect x={-46} y={-30} width={92} height={40} rx={3} fill="var(--bg-panel)" stroke="var(--border-strong)" />
        <text x={0} y={-16} textAnchor="middle" className="distance-overlay__label">
          {distance.euclidean.toFixed(2)} m
        </text>
        <text x={0} y={-4} textAnchor="middle" className="distance-overlay__label distance-overlay__label--muted">
          H {distance.horizontal.toFixed(2)}  V {distance.vertical.toFixed(2)}
        </text>
        <text x={0} y={8} textAnchor="middle" className="distance-overlay__label distance-overlay__label--muted">
          {a.name} → {b.name}
        </text>
      </g>
    </g>
  );
}
