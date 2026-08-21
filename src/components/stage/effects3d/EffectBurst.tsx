import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshBasicMaterial } from 'three';
import { directionFromAngle, type Effect3DProps } from './types';

const PARTICLE_COUNT = 16;
const RISE_DURATION = 0.55;
const FALL_DURATION = 0.7;
const GRAVITY = 4;

/** Fast rise to apex height then a radial firework-style burst that falls and fades — mine, comet. */
export function EffectBurst({ id, position, color, height, angle, yaw, width, onDone }: Effect3DProps) {
  const coreRef = useRef<Mesh | null>(null);
  const sparkRefs = useRef<(Mesh | null)[]>([]);
  const elapsed = useRef(0);
  const done = useRef(false);
  const direction = useMemo(() => directionFromAngle(angle, yaw), [angle, yaw]);

  const sparks = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, () => {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.5;
        const speed = 1.2 + Math.random() * 1.3;
        return {
          vx: Math.sin(phi) * Math.cos(theta) * speed,
          vy: Math.cos(phi) * speed,
          vz: Math.sin(phi) * Math.sin(theta) * speed,
        };
      }),
    [],
  );

  useFrame((_, delta) => {
    if (done.current) return;
    elapsed.current += delta;
    const t = elapsed.current;

    if (t < RISE_DURATION) {
      const progress = t / RISE_DURATION;
      const travel = progress * height;
      if (coreRef.current) {
        coreRef.current.position.set(direction.x * travel, direction.y * travel, direction.z * travel);
        (coreRef.current.material as MeshBasicMaterial).opacity = 1;
      }
    } else {
      if (coreRef.current) (coreRef.current.material as MeshBasicMaterial).opacity = 0;
      const burstT = t - RISE_DURATION;
      const progress = Math.min(1, burstT / FALL_DURATION);
      const apexX = direction.x * height;
      const apexY = direction.y * height;
      const apexZ = direction.z * height;
      sparks.forEach((s, i) => {
        const mesh = sparkRefs.current[i];
        if (!mesh) return;
        const x = apexX + s.vx * burstT * width;
        const z = apexZ + s.vz * burstT * width;
        const y = apexY + s.vy * burstT * width - 0.5 * GRAVITY * burstT * burstT;
        mesh.position.set(x, Math.max(0, y), z);
        (mesh.material as MeshBasicMaterial).opacity = Math.max(0, 1 - progress);
      });
    }

    if (t >= RISE_DURATION + FALL_DURATION) {
      done.current = true;
      onDone(id);
    }
  });

  return (
    <group position={position}>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0} />
      </mesh>
      {sparks.map((_, i) => (
        <mesh key={i} ref={(el) => { sparkRefs.current[i] = el; }}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0} />
        </mesh>
      ))}
    </group>
  );
}
