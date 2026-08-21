import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, type Mesh, type MeshBasicMaterial } from 'three';
import { directionFromAngle, type Effect3DProps } from './types';

const PARTICLE_COUNT = 20;
const DURATION = 1.1;
const HOT_CORE = new Color('#fff3c4');

/**
 * Upward jet of small particles, styled per simulationType so a Fire
 * Machine actually reads as fire rather than a generic colored jet:
 *  - flame: additive-blended, color shifts from a hot yellow core to the
 *    device's orange as it rises and cools, particles stretched into
 *    flame-like tongues, slight flicker.
 *  - spark: tiny bright additive points, fast and short-lived.
 *  - co2 (default): larger, softer, non-additive puffs — reads as vapor.
 */
export function EffectJet({ id, position, color, height, angle, yaw, width, shape, simulationType, onDone }: Effect3DProps) {
  const meshRefs = useRef<(Mesh | null)[]>([]);
  const elapsed = useRef(0);
  const done = useRef(false);
  const deviceColor = useMemo(() => new Color(color), [color]);
  const direction = useMemo(() => directionFromAngle(angle, yaw), [angle, yaw]);
  const isFlame = simulationType === 'flame';
  const isSpark = simulationType === 'spark';

  const particles = useMemo(
    () =>
      Array.from({ length: isSpark ? PARTICLE_COUNT * 1.4 : PARTICLE_COUNT }, () => ({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * (isSpark ? 0.06 : 0.15),
        speed: 0.7 + Math.random() * 0.6,
        delay: Math.random() * (isSpark ? 0.15 : 0.25),
        size: isSpark ? 0.02 + Math.random() * 0.03 : 0.05 + Math.random() * 0.06,
        flicker: Math.random() * Math.PI * 2,
      })),
    [isSpark],
  );

  useFrame((_, delta) => {
    if (done.current) return;
    elapsed.current += delta;
    const t = elapsed.current;

    particles.forEach((p, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      const local = t - p.delay;
      const material = mesh.material as MeshBasicMaterial;
      if (local <= 0) {
        material.opacity = 0;
        return;
      }
      const progress = Math.min(1, local / DURATION);
      const wobble = isFlame ? Math.sin(local * 10 + p.flicker) * 0.04 * progress : 0;
      const travel = progress * height * p.speed;
      const baseGrowth = isFlame ? 1.4 : 2;
      const spreadFactor =
        shape === 'invertedCone'
          ? 1 + (1 - progress) * baseGrowth
          : shape === 'open'
            ? 1 + baseGrowth
            : 1 + progress * baseGrowth;
      const spread = spreadFactor * width;
      mesh.position.set(
        direction.x * travel + Math.cos(p.angle) * p.radius * spread + wobble,
        direction.y * travel,
        direction.z * travel + Math.sin(p.angle) * p.radius * spread + wobble,
      );

      if (isFlame) {
        material.color.lerpColors(HOT_CORE, deviceColor, Math.min(1, progress * 1.6));
        mesh.scale.set(1, 1.6 - progress * 0.6, 1);
      }
      material.opacity = Math.max(0, 1 - progress) * (isSpark ? 1 : 0.9);
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
          <meshBasicMaterial
            color={isFlame ? HOT_CORE : color}
            transparent
            opacity={0}
            blending={isFlame || isSpark ? AdditiveBlending : undefined}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
