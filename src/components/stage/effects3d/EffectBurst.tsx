import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, Quaternion, Vector3, type Mesh, type MeshBasicMaterial } from 'three';
import { directionFromAngle, type Effect3DProps } from './types';

const PARTICLE_COUNT = 18;
// Real mine/comet shells crack open almost instantly — a brief tap should
// already show the full burst, not a slow half-second climb to it.
const RISE_DURATION = 0.14;
const FALL_DURATION = 0.75;
const GRAVITY = 5;
const HOT_WHITE = new Color('#ffffff');
const UP = new Vector3(0, 1, 0);

/**
 * Fast rise to apex then a radial firework-style burst of glowing
 * comet-trail sparks that arc, fall and fade — mine, comet. Each spark is
 * stretched and rotated to face its own instantaneous (gravity-affected)
 * velocity direction so it reads as a short bright trail rather than a
 * round dot, closer to how a real firework burst looks on camera.
 */
export function EffectBurst({ id, position, color, height, angle, yaw, width, onDone }: Effect3DProps) {
  const coreRef = useRef<Mesh | null>(null);
  const sparkRefs = useRef<(Mesh | null)[]>([]);
  const elapsed = useRef(0);
  const done = useRef(false);
  const direction = useMemo(() => directionFromAngle(angle, yaw), [angle, yaw]);
  const sparkColor = useMemo(() => new Color(color), [color]);

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

  // Reused scratch objects for per-frame quaternion orientation — avoids
  // allocating a new Vector3/Quaternion for every spark on every frame.
  const scratchDir = useMemo(() => new Vector3(), []);
  const scratchQuat = useMemo(() => new Quaternion(), []);

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
        const vy = s.vy * width - GRAVITY * burstT;
        const y = apexY + s.vy * burstT * width - 0.5 * GRAVITY * burstT * burstT;
        mesh.position.set(x, Math.max(0, y), z);

        scratchDir.set(s.vx * width, vy, s.vz * width).normalize();
        scratchQuat.setFromUnitVectors(UP, scratchDir);
        mesh.quaternion.copy(scratchQuat);
        const speed = Math.min(2.5, Math.hypot(s.vx * width, vy, s.vz * width));
        mesh.scale.set(1, 0.6 + speed * 0.5, 1);

        const mat = mesh.material as MeshBasicMaterial;
        mat.color.lerpColors(HOT_WHITE, sparkColor, Math.min(1, progress * 1.4));
        mat.opacity = Math.max(0, 1 - progress);
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
        <meshBasicMaterial color={color} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      {sparks.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            sparkRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.055, 6, 6]} />
          <meshBasicMaterial color={HOT_WHITE} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
