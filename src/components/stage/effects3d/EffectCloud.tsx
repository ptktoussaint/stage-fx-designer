import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshBasicMaterial } from 'three';
import type { Effect3DProps } from './types';

const PUFF_COUNT = 5;
const DURATION = 2.6;

/** Slow-expanding translucent puffs that drift and fade — smoke, fog. */
export function EffectCloud({ id, position, color, onDone }: Effect3DProps) {
  const meshRefs = useRef<(Mesh | null)[]>([]);
  const elapsed = useRef(0);
  const done = useRef(false);

  const puffs = useMemo(
    () =>
      Array.from({ length: PUFF_COUNT }, () => ({
        offsetX: (Math.random() - 0.5) * 0.6,
        offsetZ: (Math.random() - 0.5) * 0.6,
        riseSpeed: 0.2 + Math.random() * 0.3,
        delay: Math.random() * 0.6,
        maxScale: 0.9 + Math.random() * 0.7,
      })),
    [],
  );

  useFrame((_, delta) => {
    if (done.current) return;
    elapsed.current += delta;
    const t = elapsed.current;

    puffs.forEach((p, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      const local = t - p.delay;
      if (local <= 0) {
        (mesh.material as MeshBasicMaterial).opacity = 0;
        return;
      }
      const progress = Math.min(1, local / (DURATION - p.delay));
      const scale = 0.2 + progress * p.maxScale;
      mesh.scale.setScalar(scale);
      mesh.position.set(p.offsetX * (1 + progress), local * p.riseSpeed, p.offsetZ * (1 + progress));
      (mesh.material as MeshBasicMaterial).opacity = Math.sin(Math.min(1, progress) * Math.PI) * 0.4;
    });

    if (t >= DURATION) {
      done.current = true;
      onDone(id);
    }
  });

  return (
    <group position={position}>
      {puffs.map((_, i) => (
        <mesh key={i} ref={(el) => { meshRefs.current[i] = el; }}>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
