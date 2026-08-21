import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, ConeGeometry, Quaternion, Vector3, type Mesh, type MeshBasicMaterial } from 'three';
import { directionFromAngle, type Effect3DProps } from './types';

const HOT_CORE = new Color('#fff3c4');
const CO2_MIST = new Color('#e8f0f5');
const UP = new Vector3(0, 1, 0);

// Unit cone (radius 1, height 1) with its local origin moved to the base
// instead of three.js's default center — so animating a mesh's scale.y
// grows the cone purely upward from a fixed point (the nozzle) instead of
// stretching symmetrically out from its middle. Shared by every FlameJet
// instance since it's never mutated after creation.
const BASE_CONE_GEOMETRY = new ConeGeometry(1, 1, 8).translate(0, 0.5, 0);

/**
 * Real pyro/CO2 hits full strength almost the instant it's triggered — a
 * brief attack, a held burst, then it dies back down. All three families
 * below share that attack/hold/decay envelope instead of the old "particles
 * slowly travel from the nozzle to the tip over the whole effect duration"
 * shape, which read as a gradual bloom rather than a triggered blast.
 */
export function EffectJet(props: Effect3DProps) {
  if (props.simulationType === 'flame') return <FlameJet {...props} />;
  if (props.simulationType === 'co2') return <Co2Jet {...props} />;
  return <SparkJet {...props} />;
}

const FLAME_ATTACK = 0.05;
const FLAME_SUSTAIN_END = 0.4;
const FLAME_DECAY_END = 0.9;

/** Fire-machine flame: a bright core plus a handful of flickering tongues, all rooted at the nozzle and growing straight up it (via BASE_CONE_GEOMETRY), oriented as a group toward the device's trajectory. */
function FlameJet({ id, position, color, height, angle, yaw, width, onDone }: Effect3DProps) {
  const coreRef = useRef<Mesh>(null);
  const tongueRefs = useRef<(Mesh | null)[]>([]);
  const emberRefs = useRef<(Mesh | null)[]>([]);
  const elapsed = useRef(0);
  const done = useRef(false);
  const deviceColor = useMemo(() => new Color(color), [color]);
  const direction = useMemo(() => directionFromAngle(angle, yaw), [angle, yaw]);
  const orientation = useMemo(
    () => new Quaternion().setFromUnitVectors(UP, new Vector3(direction.x, direction.y, direction.z)),
    [direction],
  );

  const tongues = useMemo(
    () =>
      Array.from({ length: 5 }, () => ({
        angleOffset: (Math.random() - 0.5) * 0.6,
        tiltOffset: (Math.random() - 0.5) * 0.5,
        radiusScale: 0.55 + Math.random() * 0.4,
        heightScale: 0.75 + Math.random() * 0.35,
        colorMix: 0.35 + Math.random() * 0.5,
        flickerPhase: Math.random() * Math.PI * 2,
        flickerSpeed: 9 + Math.random() * 6,
      })),
    [],
  );

  const embers = useMemo(
    () =>
      Array.from({ length: 7 }, () => ({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * 0.12,
        speed: 1.1 + Math.random() * 0.5,
        delay: Math.random() * 0.1,
        size: 0.02 + Math.random() * 0.025,
      })),
    [],
  );

  useFrame((_, delta) => {
    if (done.current) return;
    elapsed.current += delta;
    const t = elapsed.current;

    let envelope: number;
    if (t < FLAME_ATTACK) envelope = t / FLAME_ATTACK;
    else if (t < FLAME_SUSTAIN_END) envelope = 1;
    else envelope = Math.max(0, 1 - (t - FLAME_SUSTAIN_END) / (FLAME_DECAY_END - FLAME_SUSTAIN_END));

    if (coreRef.current) {
      const mat = coreRef.current.material as MeshBasicMaterial;
      const flicker = 0.9 + Math.sin(t * 24) * 0.08;
      const r = width * 0.28 * flicker;
      coreRef.current.scale.set(r, Math.max(0.001, height * envelope * flicker), r);
      mat.opacity = envelope * 0.95;
    }

    tongues.forEach((tg, i) => {
      const mesh = tongueRefs.current[i];
      if (!mesh) return;
      const mat = mesh.material as MeshBasicMaterial;
      const flicker = 0.85 + Math.sin(t * tg.flickerSpeed + tg.flickerPhase) * 0.18;
      const r = width * 0.5 * tg.radiusScale * flicker;
      mesh.scale.set(r, Math.max(0.001, height * tg.heightScale * envelope * flicker), r);
      mesh.rotation.y = tg.angleOffset + Math.sin(t * tg.flickerSpeed * 0.5 + tg.flickerPhase) * 0.08;
      mesh.rotation.z = tg.tiltOffset * (1 - envelope * 0.3);
      mat.color.lerpColors(HOT_CORE, deviceColor, Math.min(1, tg.colorMix));
      mat.opacity = envelope * 0.85;
    });

    embers.forEach((e, i) => {
      const mesh = emberRefs.current[i];
      if (!mesh) return;
      const mat = mesh.material as MeshBasicMaterial;
      const local = t - e.delay;
      if (local <= 0 || envelope <= 0) {
        mat.opacity = 0;
        return;
      }
      const travel = Math.min(1, local * e.speed) * height * 1.15;
      mesh.position.set(Math.cos(e.angle) * e.radius * width, travel, Math.sin(e.angle) * e.radius * width);
      mat.color.lerpColors(HOT_CORE, deviceColor, Math.min(1, travel / height));
      mat.opacity = envelope * Math.max(0, 1 - local * 0.6);
    });

    if (t >= FLAME_DECAY_END + 0.05) {
      done.current = true;
      onDone(id);
    }
  });

  return (
    <group position={position} quaternion={orientation}>
      <mesh ref={coreRef} geometry={BASE_CONE_GEOMETRY}>
        <meshBasicMaterial color={HOT_CORE} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      {tongues.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            tongueRefs.current[i] = el;
          }}
          geometry={BASE_CONE_GEOMETRY}
        >
          <meshBasicMaterial color={color} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      {embers.map((e, i) => (
        <mesh
          key={i}
          ref={(el) => {
            emberRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[e.size, 6, 6]} />
          <meshBasicMaterial color={HOT_CORE} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

const CO2_ATTACK = 0.08;
const CO2_HOLD_END = 0.5;
const CO2_DURATION = 1.4;

/** CO2 jet: a dense burst of near-simultaneous vapor puffs (almost no onset stagger, unlike the old slow-building particle drift) that hold near full extension, then keep drifting/expanding as they dissipate. */
function Co2Jet({ id, position, color, height, angle, yaw, width, shape, onDone }: Effect3DProps) {
  const puffRefs = useRef<(Mesh | null)[]>([]);
  const elapsed = useRef(0);
  const done = useRef(false);
  const mistColor = useMemo(() => CO2_MIST.clone().lerp(new Color(color), 0.25), [color]);
  const direction = useMemo(() => directionFromAngle(angle, yaw), [angle, yaw]);

  const puffs = useMemo(
    () =>
      Array.from({ length: 16 }, () => ({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * 0.22,
        travelFactor: 0.55 + Math.random() * 0.55,
        delay: Math.random() * 0.05,
        size: 0.09 + Math.random() * 0.09,
        driftSpeed: 0.4 + Math.random() * 0.5,
      })),
    [],
  );

  useFrame((_, delta) => {
    if (done.current) return;
    elapsed.current += delta;
    const t = elapsed.current;

    puffs.forEach((p, i) => {
      const mesh = puffRefs.current[i];
      if (!mesh) return;
      const mat = mesh.material as MeshBasicMaterial;
      const local = t - p.delay;
      if (local <= 0) {
        mat.opacity = 0;
        return;
      }

      const attackProgress = Math.min(1, local / CO2_ATTACK);
      const drift = Math.max(0, local - CO2_ATTACK) * p.driftSpeed;
      const travel = attackProgress * height * p.travelFactor + drift;

      const baseGrowth = 1.6;
      const growProgress = Math.min(1, local / CO2_DURATION);
      const spreadFactor =
        shape === 'invertedCone'
          ? 1 + (1 - growProgress) * baseGrowth
          : shape === 'open'
            ? 1 + baseGrowth
            : 1 + growProgress * baseGrowth;
      const spread = spreadFactor * width;

      mesh.position.set(
        direction.x * travel + Math.cos(p.angle) * p.radius * spread,
        direction.y * travel,
        direction.z * travel + Math.sin(p.angle) * p.radius * spread,
      );
      mesh.scale.setScalar(1 + growProgress * 0.8);

      const opacity =
        local < CO2_HOLD_END
          ? attackProgress * 0.75
          : Math.max(0, 0.75 * (1 - (local - CO2_HOLD_END) / (CO2_DURATION - CO2_HOLD_END)));
      mat.opacity = opacity;
    });

    if (t >= CO2_DURATION + 0.1) {
      done.current = true;
      onDone(id);
    }
  });

  return (
    <group position={position}>
      {puffs.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => {
            puffRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[p.size, 7, 7]} />
          <meshBasicMaterial color={mistColor} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

const SPARK_DURATION = 0.55;

/** Spark burst: quick bright points radiating outward, near-simultaneous onset for a snappy strike rather than a trickle. */
function SparkJet({ id, position, color, height, angle, yaw, width, shape, onDone }: Effect3DProps) {
  const meshRefs = useRef<(Mesh | null)[]>([]);
  const elapsed = useRef(0);
  const done = useRef(false);
  const direction = useMemo(() => directionFromAngle(angle, yaw), [angle, yaw]);

  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, () => ({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * 0.08,
        speed: 0.85 + Math.random() * 0.5,
        delay: Math.random() * 0.04,
        size: 0.018 + Math.random() * 0.026,
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
      const mat = mesh.material as MeshBasicMaterial;
      const local = t - p.delay;
      if (local <= 0) {
        mat.opacity = 0;
        return;
      }
      const progress = Math.min(1, local / SPARK_DURATION);
      const travel = progress * height * p.speed;
      const baseGrowth = 2;
      const spreadFactor =
        shape === 'invertedCone'
          ? 1 + (1 - progress) * baseGrowth
          : shape === 'open'
            ? 1 + baseGrowth
            : 1 + progress * baseGrowth;
      const spread = spreadFactor * width;
      mesh.position.set(
        direction.x * travel + Math.cos(p.angle) * p.radius * spread,
        direction.y * travel,
        direction.z * travel + Math.sin(p.angle) * p.radius * spread,
      );
      mat.opacity = Math.max(0, 1 - progress);
    });

    if (t >= SPARK_DURATION + 0.15) {
      done.current = true;
      onDone(id);
    }
  });

  return (
    <group position={position}>
      {particles.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[p.size, 6, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
