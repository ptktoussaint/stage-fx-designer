import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Color } from 'three';
import type { PlatformInstance, Vector3 } from '../../types';
import { useSelectionStore } from '../../stores/selectionStore';

interface PlatformMesh3DProps {
  platform: PlatformInstance;
  onDragStart: (kind: 'platform', id: string, position: Vector3) => void;
}

/** Box sized to the platform's real width x height x depth (meters) — unlike
 * DeviceMesh3D's readable marker, this IS meant to be a true-scale model
 * since its whole purpose is occupying real space (e.g. a DJ table other
 * effects get positioned relative to). */
export function PlatformMesh3D({ platform, onDragStart }: PlatformMesh3DProps) {
  const isSelected = useSelectionStore((s) => s.selectedPlatformIds.includes(platform.id));
  const selectPlatform = useSelectionStore((s) => s.selectPlatform);

  const color = useMemo(() => new Color(platform.color), [platform.color]);
  const { width, height, depth } = platform.dimensions;

  const position: [number, number, number] = [
    platform.position.x,
    platform.position.z + height / 2,
    platform.position.y,
  ];

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    selectPlatform(platform.id);
    if (!platform.locked) onDragStart('platform', platform.id, platform.position);
  };

  return (
    <group position={position} rotation={[0, (-platform.rotation.z * Math.PI) / 180, 0]}>
      <mesh castShadow receiveShadow onPointerDown={handlePointerDown}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {isSelected && (
        <mesh>
          <boxGeometry args={[width + 0.03, height + 0.03, depth + 0.03]} />
          <meshBasicMaterial color="#4f8cff" wireframe />
        </mesh>
      )}
    </group>
  );
}
