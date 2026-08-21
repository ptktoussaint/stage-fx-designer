import { memo } from 'react';
import type { DeviceInstance } from '../../types';
import { getDeviceDefinition } from '../../devices/registry';
import { Icon } from '../common/Icon';
import { metersToPixels } from '../../engine/coordinates';

interface DeviceNodeProps {
  device: DeviceInstance;
  pixelsPerMeter: number;
  screenX: number;
  screenY: number;
  isSelected: boolean;
  isTriggered: boolean;
  onPointerDown: (e: React.PointerEvent, deviceId: string) => void;
  onContextMenu: (e: React.MouseEvent, deviceId: string) => void;
}

const CATEGORY_COLOR_VAR: Record<string, string> = {
  FIRE: '--cat-fire',
  CO2: '--cat-co2',
  SPARK: '--cat-spark',
  PYRO_SIMULATION: '--cat-pyro',
  ATMOSPHERIC: '--cat-atmospheric',
  CONFETTI: '--cat-confetti',
};

export const DeviceNode = memo(function DeviceNode({
  device,
  pixelsPerMeter,
  screenX,
  screenY,
  isSelected,
  isTriggered,
  onPointerDown,
  onContextMenu,
}: DeviceNodeProps) {
  const definition = getDeviceDefinition(device.definitionId);
  if (!definition) return null;

  const bodyColorVar = device.bodyColor ? undefined : CATEGORY_COLOR_VAR[definition.category];
  const bodyColor = device.bodyColor ?? `var(${bodyColorVar})`;
  const effectColorVar = device.color ? undefined : CATEGORY_COLOR_VAR[definition.category];
  const effectColor = device.color ?? `var(${effectColorVar})`;
  const footprintPx = metersToPixels(
    Math.max(definition.footprint.width, definition.footprint.depth),
    pixelsPerMeter,
  );
  const radius = Math.max(9, footprintPx / 2);

  return (
    <g
      data-device-id={device.id}
      transform={`translate(${screenX} ${screenY}) rotate(${device.rotation.z})`}
      onPointerDown={(e) => onPointerDown(e, device.id)}
      onContextMenu={(e) => onContextMenu(e, device.id)}
      style={{ cursor: device.locked ? 'not-allowed' : 'grab', opacity: device.enabled ? 1 : 0.4 }}
    >
      {isTriggered && (
        <circle r={radius + 6} fill="none" stroke={effectColor} strokeWidth={2} className="device-node__pulse" />
      )}
      {isSelected && (
        <circle r={radius + 4} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="3 2" />
      )}
      <circle r={radius} fill="var(--bg-panel-alt)" stroke={bodyColor} strokeWidth={2} />
      <g transform={`translate(${-7} ${-7}) rotate(${-device.rotation.z})`} color={bodyColor}>
        <Icon name={definition.icon as never} size={14} />
      </g>
      <text
        x={0}
        y={radius + 12}
        transform={`rotate(${-device.rotation.z})`}
        textAnchor="middle"
        className="device-node__label"
      >
        {device.name}
      </text>
      {device.locked && (
        <g transform={`translate(${radius - 4} ${-radius - 2}) rotate(${-device.rotation.z})`} color="var(--text-muted)">
          <Icon name="lock" size={10} />
        </g>
      )}
    </g>
  );
});
