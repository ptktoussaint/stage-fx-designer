import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, type Mesh, type MeshBasicMaterial } from 'three';
import { directionFromAngle, type Effect3DProps } from './types';

const PIECE_COUNT = 22;
const DURATION = 2.2;
const GRAVITY = 3;
const CONFETTI_COLORS = ['#e0693f', '#4fb8d6', '#e0c23f', '#a06fe0', '#4bbf7a', '#e5555f'];

/** Small colored pieces launched up/outward then falling with a lazy spin — confetti cannon, streamer. */
export function EffectConfettiFall({ id, position, height, angle, yaw, width, onDone }: Effect3DProps) {
  const meshRefs = useRef<(Mesh | null)[]>([]);
  const elapsed = useRef(0);
  const done = useRef(false);
  const direction = useMemo(() => directionFromAngle(angle, yaw), [angle, yaw]);

  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, () => {
        const angle = Math.random() * Math.PI * 2;
        const spread = 0.6 + Math.random() * 1.4;
        return {
          vx: Math.cos(angle) * spread,
          vz: Math.sin(angle) * spread,
          vy: height * (0.8 + Math.random() * 0.5),
          spin: (Math.random() - 0.5) * 8,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        };
      }),
    [height],
  );

  useFrame((_, delta) => {
    if (done.current) return;
    elapsed.current += delta;
    const t = elapsed.current;
    const progress = Math.min(1, t / DURATION);

    pieces.forEach((p, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      const launchTravel = p.vy * t;
      const x = direction.x * launchTravel + p.vx * t * width;
      const z = direction.z * launchTravel + p.vz * t * width;
      const y = Math.max(0, direction.y * launchTravel - 0.5 * GRAVITY * t * t);
      mesh.position.set(x, y, z);
      mesh.rotation.set(t * p.spin, t * p.spin * 0.7, 0);
      (mesh.material as MeshBasicMaterial).opacity = Math.max(0, 1 - progress);
    });

    if (t >= DURATION) {
      done.current = true;
      onDone(id);
    }
  });

  return (
    <group position={position}>
      {pieces.map((p, i) => (
        <mesh key={i} ref={(el) => { meshRefs.current[i] = el; }}>
          <planeGeometry args={[0.06, 0.06]} />
          <meshBasicMaterial color={p.color} transparent opacity={1} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
