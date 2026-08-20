import { memo } from 'react';
import type { FigureInstance } from '../../types';
import { getFigureDefinition } from '../../figures/registry';
import { Icon } from '../common/Icon';
import { metersToPixels } from '../../engine/coordinates';

interface FigureNodeProps {
  figure: FigureInstance;
  pixelsPerMeter: number;
  screenX: number;
  screenY: number;
  isSelected: boolean;
  onPointerDown: (e: React.PointerEvent, figureId: string) => void;
  onContextMenu: (e: React.MouseEvent, figureId: string) => void;
}

export const FigureNode = memo(function FigureNode({
  figure,
  pixelsPerMeter,
  screenX,
  screenY,
  isSelected,
  onPointerDown,
  onContextMenu,
}: FigureNodeProps) {
  const definition = getFigureDefinition(figure.definitionId);
  if (!definition) return null;

  const color = figure.color ?? 'var(--accent)';
  const footprintPx = metersToPixels(Math.max(definition.footprint.width, definition.footprint.depth), pixelsPerMeter);
  const radius = Math.max(8, footprintPx / 2);

  return (
    <g
      data-figure-id={figure.id}
      transform={`translate(${screenX} ${screenY}) rotate(${figure.rotation.z})`}
      onPointerDown={(e) => onPointerDown(e, figure.id)}
      onContextMenu={(e) => onContextMenu(e, figure.id)}
      style={{ cursor: figure.locked ? 'not-allowed' : 'grab' }}
    >
      {isSelected && (
        <circle r={radius + 4} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="3 2" />
      )}
      <circle r={radius} fill="var(--bg-panel-alt)" stroke={color} strokeWidth={2} />
      <g transform={`translate(${-7} ${-7}) rotate(${-figure.rotation.z})`} color={color}>
        <Icon name={definition.icon as never} size={14} />
      </g>
      <text x={0} y={radius + 12} transform={`rotate(${-figure.rotation.z})`} textAnchor="middle" className="device-node__label">
        {figure.name}
      </text>
    </g>
  );
});
