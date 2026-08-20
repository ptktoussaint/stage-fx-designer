import { memo } from 'react';
import type { PlatformInstance } from '../../types';
import { metersToPixels } from '../../engine/coordinates';

interface PlatformNodeProps {
  platform: PlatformInstance;
  pixelsPerMeter: number;
  screenX: number;
  screenY: number;
  isSelected: boolean;
  onPointerDown: (e: React.PointerEvent, platformId: string) => void;
  onContextMenu: (e: React.MouseEvent, platformId: string) => void;
}

/** Top-down rectangle sized to the platform's real width x depth, centered
 * on its position (position = base-center, matching PlatformInstance). */
export const PlatformNode = memo(function PlatformNode({
  platform,
  pixelsPerMeter,
  screenX,
  screenY,
  isSelected,
  onPointerDown,
  onContextMenu,
}: PlatformNodeProps) {
  const w = metersToPixels(platform.dimensions.width, pixelsPerMeter);
  const d = metersToPixels(platform.dimensions.depth, pixelsPerMeter);

  return (
    <g
      data-platform-id={platform.id}
      transform={`translate(${screenX} ${screenY}) rotate(${platform.rotation.z})`}
      onPointerDown={(e) => onPointerDown(e, platform.id)}
      onContextMenu={(e) => onContextMenu(e, platform.id)}
      style={{ cursor: platform.locked ? 'not-allowed' : 'grab' }}
    >
      <rect
        x={-w / 2}
        y={-d / 2}
        width={w}
        height={d}
        fill={platform.color}
        fillOpacity={0.35}
        stroke={isSelected ? 'var(--accent)' : platform.color}
        strokeWidth={isSelected ? 2 : 1.5}
        strokeDasharray={isSelected ? undefined : '4 2'}
      />
      <text y={4} textAnchor="middle" className="device-node__label">
        {platform.name}
      </text>
    </g>
  );
});
