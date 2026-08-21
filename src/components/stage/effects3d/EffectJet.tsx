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
 *
 * CO2 and spark additionally support a continuous hold (`holdUntil`,
 * refreshed by SimulationEffects3D on every retrigger from a held hotkey):
 * their particles loop continuously while held instead of finishing a fixed
 * one-shot arc, so holding the key reads as one sustained jet rather than a
 * pile of separate bursts stacking on top of each other.
 */
export function EffectJet(props: Effect3DProps) {
  if (props.simulationType === 'flame') return <FlameJet {...props} />;
  if (props.simulationType === 'co2') return <Co2Jet {...props} />;
  return <SparkJet {...props} />;
}

/** Wraps `v` into [0, cycle) — the saw-tooth used to keep a particle looping through a fixed travel/fade arc for as long as an effect is held. */
function wrapTime(v: number, cycle: number): number {
  return ((v % cycle) + cycle) % cycle;
}

/**
 * A particle's local position within its travel/fade cycle: loops
 * (wraps every `cycle` seconds) while still held, so a continuous stream of
 * particles is always mid-flight; once released (now >= holdUntil) the wrap
 * freezes at that instant and time keeps counting up linearly instead of
 * wrapping — so whatever's in flight finishes its current arc once and
 * fades, rather than snapping back to the nozzle for another lap.
 */
function continuousLocalTime(now: number, holdUntil: number, cycle: number, phase: number): number {
  if (now < holdUntil) return wrapTime(now / 1000 + phase, cycle);
  return wrapTime(holdUntil / 1000 + phase, cycle) + (now - holdUntil) / 1000;
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
const CO2_CYCLE = 1;
const CO2_FADE_START = 0.55;

/**
 * CO2 jet: puffs are staggered across one continuous travel/fade cycle
 * (`CO2_CYCLE`) instead of all sharing one clock, so while the effect is
 * held there's always a steady stream of puffs mid-flight — reading as one
 * continuous jet rather than the whole burst popping and fading in unison
 * every time a held hotkey retriggers it.
 */
function Co2Jet({ id, position, color, height, angle, yaw, width, shape, holdUntil, onDone }: Effect3DProps) {
  const puffRefs = useRef<(Mesh | null)[]>([]);
  const done = useRef(false);
  const mistColor = useMemo(() => CO2_MIST.clone().lerp(new Color(color), 0.25), [color]);
  const direction = useMemo(() => directionFromAngle(angle, yaw), [angle, yaw]);

  const puffs = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * 0.22,
        travelFactor: 0.6 + Math.random() * 0.5,
        phase: (i / 14) * CO2_CYCLE + Math.random() * 0.05,
        driftSpeed: 0.3 + Math.random() * 0.4,
        size: 0.09 + Math.random() * 0.09,
      })),
    [],
  );

  useFrame(() => {
    if (done.current) return;
    const now = performance.now();
    const holdUntilSafe = holdUntil ?? now;

    puffs.forEach((p, i) => {
      const mesh = puffRefs.current[i];
      if (!mesh) return;
      const mat = mesh.material as MeshBasicMaterial;

      const local = continuousLocalTime(now, holdUntilSafe, CO2_CYCLE, p.phase);
      const progress = local / CO2_CYCLE;
      const attackProgress = Math.min(1, local / CO2_ATTACK);
      const travelProgress = Math.min(1, progress);
      const travel = height * p.travelFactor * travelProgress + p.driftSpeed * height * Math.min(1.3, progress);

      const baseGrowth = 1.6;
      const spreadFactor =
        shape === 'invertedCone'
          ? 1 + (1 - travelProgress) * baseGrowth
          : shape === 'open'
            ? 1 + baseGrowth
            : 1 + travelProgress * baseGrowth;
      const spread = spreadFactor * width;

      mesh.position.set(
        direction.x * travel + Math.cos(p.angle) * p.radius * spread,
        direction.y * travel,
        direction.z * travel + Math.sin(p.angle) * p.radius * spread,
      );
      mesh.scale.setScalar(1 + travelProgress * 0.8);

      const fadeProgress = Math.max(0, (progress - CO2_FADE_START) / (1 - CO2_FADE_START));
      mat.opacity = attackProgress * Math.max(0, 1 - fadeProgress) * 0.75;
    });

    if (now - holdUntilSafe > (CO2_CYCLE + 0.15) * 1000) {
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

const SPARK_ATTACK = 0.04;
const SPARK_DECAY = 0.35;
const SPARK_EMBER_CYCLE = 0.5;

/**
 * Cold-spark fountain (Sparkular): same base-anchored cone construction as
 * FlameJet — a slim core plus a few flickering tongues, all rooted at the
 * nozzle via BASE_CONE_GEOMETRY — but bright white/gold instead of orange,
 * with a dense continuous shower of small bright embers streaming up
 * through it for the actual "faísca" sparkle read. Continuous-hold like
 * Co2Jet: the body's envelope simply stays at full strength for as long as
 * `holdUntil` keeps getting pushed forward, and the embers loop the same
 * way CO2's puffs do.
 */
function SparkJet({ id, position, color, height, angle, yaw, width, holdUntil, onDone }: Effect3DProps) {
  const coreRef = useRef<Mesh>(null);
  const tongueRefs = useRef<(Mesh | null)[]>([]);
  const emberRefs = useRef<(Mesh | null)[]>([]);
  const sinceMount = useRef(0);
  const done = useRef(false);
  const sparkColor = useMemo(() => new Color('#fff6d8').lerp(new Color(color), 0.35), [color]);
  const direction = useMemo(() => directionFromAngle(angle, yaw), [angle, yaw]);
  const orientation = useMemo(
    () => new Quaternion().setFromUnitVectors(UP, new Vector3(direction.x, direction.y, direction.z)),
    [direction],
  );

  const tongues = useMemo(
    () =>
      Array.from({ length: 4 }, () => ({
        angleOffset: (Math.random() - 0.5) * 0.5,
        radiusScale: 0.35 + Math.random() * 0.25,
        heightScale: 0.8 + Math.random() * 0.3,
        flickerPhase: Math.random() * Math.PI * 2,
        flickerSpeed: 16 + Math.random() * 10,
      })),
    [],
  );

  const embers = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * 0.14,
        travelFactor: 0.9 + Math.random() * 0.4,
        phase: (i / 16) * SPARK_EMBER_CYCLE + Math.random() * 0.03,
        size: 0.015 + Math.random() * 0.02,
      })),
    [],
  );

  useFrame((_, delta) => {
    if (done.current) return;
    sinceMount.current += delta;
    const now = performance.now();
    const holdUntilSafe = holdUntil ?? now;

    let envelope: number;
    if (sinceMount.current < SPARK_ATTACK) envelope = sinceMount.current / SPARK_ATTACK;
    else if (now < holdUntilSafe) envelope = 1;
    else envelope = Math.max(0, 1 - (now - holdUntilSafe) / 1000 / SPARK_DECAY);

    if (coreRef.current) {
      const mat = coreRef.current.material as MeshBasicMaterial;
      const flicker = 0.85 + Math.sin(now * 0.03) * 0.15;
      const r = width * 0.12 * flicker;
      coreRef.current.scale.set(r, Math.max(0.001, height * envelope * flicker), r);
      mat.opacity = envelope * 0.5;
    }

    tongues.forEach((tg, i) => {
      const mesh = tongueRefs.current[i];
      if (!mesh) return;
      const mat = mesh.material as MeshBasicMaterial;
      const flicker = 0.65 + Math.sin(now * 0.001 * tg.flickerSpeed + tg.flickerPhase) * 0.35;
      const r = width * 0.22 * tg.radiusScale * Math.max(0.25, flicker);
      mesh.scale.set(r, Math.max(0.001, height * tg.heightScale * envelope * Math.max(0.25, flicker)), r);
      mesh.rotation.y = tg.angleOffset + Math.sin(now * 0.0004 * tg.flickerSpeed) * 0.12;
      mat.opacity = envelope * 0.7 * Math.max(0.25, flicker);
    });

    embers.forEach((e, i) => {
      const mesh = emberRefs.current[i];
      if (!mesh) return;
      const mat = mesh.material as MeshBasicMaterial;
      const local = continuousLocalTime(now, holdUntilSafe, SPARK_EMBER_CYCLE, e.phase);
      const progress = local / SPARK_EMBER_CYCLE;
      const travel = height * e.travelFactor * Math.min(1.15, progress * 1.6);
      mesh.position.set(Math.cos(e.angle) * e.radius * width, travel, Math.sin(e.angle) * e.radius * width);
      const fade = Math.max(0, 1 - progress);
      mat.opacity = Math.min(1, progress * 8) * fade;
    });

    if (now - holdUntilSafe > Math.max(SPARK_DECAY, SPARK_EMBER_CYCLE) * 1000 + 100) {
      done.current = true;
      onDone(id);
    }
  });

  return (
    <group position={position} quaternion={orientation}>
      <mesh ref={coreRef} geometry={BASE_CONE_GEOMETRY}>
        <meshBasicMaterial color={sparkColor} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      {tongues.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            tongueRefs.current[i] = el;
          }}
          geometry={BASE_CONE_GEOMETRY}
        >
          <meshBasicMaterial color={sparkColor} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      {embers.map((e, i) => (
        <mesh
          key={i}
          ref={(el) => {
            emberRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[e.size, 5, 5]} />
          <meshBasicMaterial color="#fffaf0" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
