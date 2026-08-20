import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshBasicMaterial } from 'three';
import type { Effect3DProps } from './types';

const PARTICLE_COUNT = 14;
const DURATION = 1.1;

/** Upward jet of small particles — flame, CO2, spark. */
export function EffectJet({ id, position, color, height, onDone }: Effect3DProps) {
  const meshRefs = useRef<(Mesh | null)[]>([]);
  const elapsed = useRef(0);
  const done = useRef(false);

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, () => ({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * 0.15,
        speed: 0.7 + Math.random() * 0.6,
        delay: Math.random() * 0.25,
        size: 0.05 + Math.random() * 0.06,
      })),
    [],
  );

  useFrame((_, delta) => {
    if (done.current) return;
    elapsed.current += delta;
    const t = elapsed.current;

    particles.forEach((p, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      const local = t - p.delay;
      if (local <= 0) {
        (mesh.material as MeshBasicMaterial).opacity = 0;
        return;
      }
      const progress = Math.min(1, local / DURATION);
      const y = progress * height * p.speed;
      mesh.position.set(Math.cos(p.angle) * p.radius * (1 + progress * 2), y, Math.sin(p.angle) * p.radius * (1 + progress * 2));
      (mesh.material as MeshBasicMaterial).opacity = Math.max(0, 1 - progress) * 0.9;
    });

    if (t >= DURATION + 0.3) {
      done.current = true;
      onDone(id);
    }
  });

  return (
    <group position={position}>
      {particles.map((p, i) => (
        <mesh key={i} ref={(el) => { meshRefs.current[i] = el; }}>
          <sphereGeometry args={[p.size, 6, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0} />
        </mesh>
      ))}
    </group>
  );
}
