import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Color } from 'three';
import type { DeviceInstance } from '../../types';
import { getDeviceDefinition } from '../../devices/registry';
import { CATEGORY_COLOR_HEX } from '../../devices/categoryColors';
import { useSelectionStore } from '../../stores/selectionStore';

interface DeviceMesh3DProps {
  device: DeviceInstance;
}

/** One device rendered as a simple cone marker at its real x/y/z (meters). Not a scale model — a readable stage-plot marker, matching the 2D icon's role. */
export function DeviceMesh3D({ device }: DeviceMesh3DProps) {
  const definition = getDeviceDefinition(device.definitionId);
  const isSelected = useSelectionStore((s) => s.selectedDeviceIds.includes(device.id));
  const select = useSelectionStore((s) => s.select);
  const toggle = useSelectionStore((s) => s.toggle);

  const color = useMemo(
    () => new Color(device.color ?? CATEGORY_COLOR_HEX[definition?.category ?? 'ATMOSPHERIC']),
    [device.color, definition?.category],
  );

  if (!definition) return null;

  const position: [number, number, number] = [device.position.x, device.position.z, device.position.y];

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.shiftKey) toggle(device.id);
    else select(device.id);
  };

  return (
    <group position={position} rotation={[0, (-device.rotation.z * Math.PI) / 180, 0]}>
      <mesh castShadow position={[0, 0.3, 0]} onClick={handleClick}>
        <coneGeometry args={[0.25, 0.6, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={device.enabled ? 0.3 : 0}
          opacity={device.enabled ? 1 : 0.4}
          transparent
        />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.32, 0.4, 24]} />
        <meshBasicMaterial color={isSelected ? '#4f8cff' : color} transparent opacity={isSelected ? 0.9 : 0.35} />
      </mesh>
      {device.locked && (
        <mesh position={[0, 0.75, 0]}>
          <boxGeometry args={[0.12, 0.12, 0.12]} />
          <meshBasicMaterial color="#63656c" />
        </mesh>
      )}
    </group>
  );
}
