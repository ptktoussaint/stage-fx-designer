import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Quaternion,
  Vector3,
  type Mesh,
  type MeshBasicMaterial,
} from 'three';
import { directionFromAngle, type Effect3DProps } from './types';

const HOT_CORE = new Color('#fff3c4');
const HOT_WHITE = new Color('#ffffff');
const CO2_MIST = new Color('#eef2f5');
const SMOKE_COLOR = new Color('#2e2b28');
const UP = new Vector3(0, 1, 0);

// Unit cone (radius 1, height 1) with its local origin moved to the base
// instead of three.js's default center — so animating a mesh's scale.y
// grows the cone purely upward from a fixed point (the nozzle) instead of
// stretching symmetrically out from its middle. Shared by every FlameJet
// instance since it's never mutated after creation.
const BASE_CONE_GEOMETRY = new ConeGeometry(1, 1, 8).translate(0, 0.5, 0);

// Unit cylinder (radius 1, height 1, centered) used as a cheap "streak" —
// scaled thin on x/z and stretched on y toward a particle's instantaneous
// speed, then rotated to face its direction of travel, for a spark that
// reads as a short glowing trail instead of a round dot.
const STREAK_GEOMETRY = new CylinderGeometry(1, 1, 1, 4);

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
const FLAME_DECAY = 0.5;
const FLAME_EMBER_CYCLE = 0.5;
const FLAME_SMOKE_CYCLE = 1.3;

/**
 * Fire-machine flame: a bright core plus a dense bundle of flickering
 * tongues rooted at the nozzle and growing straight up it (via
 * BASE_CONE_GEOMETRY), oriented as a group toward the device's trajectory.
 * Real flame-thrower jets read as one bulky, turbulent column rather than a
 * single smooth taper — using more, wider, taller tongues than a single
 * cone bundle keeps that ragged multi-strand silhouette, and a handful of
 * dark drifting smoke puffs above the tip sell the sustained-burn look.
 *
 * Continuous-hold like Co2Jet/SparkJet: a real fire machine stays lit as
 * one continuous flame for as long as it's triggered, so this reuses the
 * same instance across retriggers (see CONTINUOUS_HOLD_TYPES) rather than
 * stacking a fresh flame on top every 250ms — which, being additive, would
 * otherwise pile up fast and wash the whole column out to solid white.
 */
function FlameJet({ id, position, color, height, angle, yaw, width, holdUntil, onDone }: Effect3DProps) {
  const coreRef = useRef<Mesh>(null);
  const tongueRefs = useRef<(Mesh | null)[]>([]);
  const emberRefs = useRef<(Mesh | null)[]>([]);
  const smokeRefs = useRef<(Mesh | null)[]>([]);
  const sinceMount = useRef(0);
  const done = useRef(false);
  // Boosted toward a punchy saturation/lightness rather than used raw — the
  // stored device color is a muted swatch meant for small UI badges/icons,
  // which reads as a pale, washed-out orange once it's the dominant color
  // across a whole flame column rather than a tiny dot.
  const deviceColor = useMemo(() => {
    const c = new Color(color);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    c.setHSL(hsl.h, Math.max(hsl.s, 0.85), Math.min(0.55, Math.max(hsl.l, 0.45)));
    return c;
  }, [color]);
  const direction = useMemo(() => directionFromAngle(angle, yaw), [angle, yaw]);
  const orientation = useMemo(
    () => new Quaternion().setFromUnitVectors(UP, new Vector3(direction.x, direction.y, direction.z)),
    [direction],
  );

  const tongues = useMemo(
    () =>
      Array.from({ length: 8 }, () => ({
        angleOffset: (Math.random() - 0.5) * 0.7,
        tiltOffset: (Math.random() - 0.5) * 0.4,
        radiusScale: 0.5 + Math.random() * 0.4,
        heightScale: 0.8 + Math.random() * 0.28,
        flickerPhase: Math.random() * Math.PI * 2,
        flickerSpeed: 9 + Math.random() * 6,
      })),
    [],
  );

  const embers = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * 0.12,
        phase: (i / 7) * FLAME_EMBER_CYCLE + Math.random() * 0.03,
        size: 0.02 + Math.random() * 0.025,
      })),
    [],
  );

  const smokePuffs = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * 0.25,
        phase: (i / 4) * FLAME_SMOKE_CYCLE,
        size: 0.16 + Math.random() * 0.14,
        drift: 0.35 + Math.random() * 0.35,
      })),
    [],
  );

  useFrame((_, delta) => {
    if (done.current) return;
    sinceMount.current += delta;
    const t = sinceMount.current;
    const now = performance.now();
    const holdUntilSafe = holdUntil ?? now;

    let envelope: number;
    if (t < FLAME_ATTACK) envelope = t / FLAME_ATTACK;
    else if (now < holdUntilSafe) envelope = 1;
    else envelope = Math.max(0, 1 - (now - holdUntilSafe) / 1000 / FLAME_DECAY);

    if (coreRef.current) {
      // Kept deliberately small — a bright glimpse of the hottest inner
      // flame near the base, not a second full-size cone. At the tongues'
      // scale, an additive core this size dominates the color and washes
      // the whole column toward pale yellow-white instead of orange.
      const mat = coreRef.current.material as MeshBasicMaterial;
      const flicker = 0.9 + Math.sin(t * 24) * 0.08;
      const r = width * 0.09 * flicker;
      coreRef.current.scale.set(r, Math.max(0.001, height * 0.35 * envelope * flicker), r);
      mat.opacity = envelope * 0.7;
    }

    tongues.forEach((tg, i) => {
      const mesh = tongueRefs.current[i];
      if (!mesh) return;
      const mat = mesh.material as MeshBasicMaterial;
      const flicker = 0.85 + Math.sin(t * tg.flickerSpeed + tg.flickerPhase) * 0.18;
      const r = width * 0.62 * tg.radiusScale * flicker;
      mesh.scale.set(r, Math.max(0.001, height * tg.heightScale * envelope * flicker), r);
      mesh.rotation.y = tg.angleOffset + Math.sin(t * tg.flickerSpeed * 0.5 + tg.flickerPhase) * 0.08;
      mesh.rotation.z = tg.tiltOffset * (1 - envelope * 0.3);
      // Set directly rather than lerped from HOT_CORE: three.js interpolates
      // Color in linear light space, and blending toward a near-white color
      // there — even at a light weighting — comes out visibly paler than
      // the naive hex-level math suggests, washing the column out instead
      // of the intended vivid orange/red.
      mat.color.copy(deviceColor);
      mat.opacity = envelope * 0.88;
    });

    embers.forEach((e, i) => {
      const mesh = emberRefs.current[i];
      if (!mesh) return;
      const mat = mesh.material as MeshBasicMaterial;
      const local = continuousLocalTime(now, holdUntilSafe, FLAME_EMBER_CYCLE, e.phase);
      const progress = local / FLAME_EMBER_CYCLE;
      const travel = Math.min(1.15, progress * 1.4) * height;
      mesh.position.set(Math.cos(e.angle) * e.radius * width, travel, Math.sin(e.angle) * e.radius * width);
      mat.color.lerpColors(HOT_CORE, deviceColor, Math.min(1, progress));
      mat.opacity = Math.min(1, progress * 8) * Math.max(0, 1 - progress);
    });

    smokePuffs.forEach((p, i) => {
      const mesh = smokeRefs.current[i];
      if (!mesh) return;
      const mat = mesh.material as MeshBasicMaterial;
      const local = continuousLocalTime(now, holdUntilSafe, FLAME_SMOKE_CYCLE, p.phase);
      const progress = local / FLAME_SMOKE_CYCLE;
      const rise = height * (1 + progress * p.drift * 2);
      const spread = 1 + progress * 2.2;
      mesh.position.set(Math.cos(p.angle) * p.radius * spread, rise, Math.sin(p.angle) * p.radius * spread);
      mesh.scale.setScalar(1 + progress * 1.8);
      mat.opacity = Math.min(1, progress * 4) * Math.max(0, 1 - progress) * 0.3;
    });

    if (now - holdUntilSafe > Math.max(FLAME_DECAY, FLAME_EMBER_CYCLE, FLAME_SMOKE_CYCLE) * 1000 + 100) {
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
          {/* Normal (non-additive) blending here, unlike the core/embers —
              8 overlapping tongues in additive mode sum their light past
              white almost immediately regardless of their own color, which
              is what made the whole column wash out pale instead of
              reading as orange/red. */}
          <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
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
      {smokePuffs.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => {
            smokeRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[p.size, 6, 6]} />
          <meshBasicMaterial color={SMOKE_COLOR} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

const CO2_ATTACK = 0.08;
const CO2_CYCLE = 1;
const CO2_FADE_START = 0.55;

/**
 * CO2 jet: a real CO2/fog jet reads as one dense, essentially opaque pillar
 * of vapor — not a string of separate visible spheres — so puffs here are
 * numerous, large and heavily overlapping with high opacity, merging into a
 * continuous billowing column instead of individually-readable "bubbles".
 * Staggered across one continuous travel/fade cycle (`CO2_CYCLE`) instead of
 * all sharing one clock, so while the effect is held there's always a
 * steady stream mid-flight — reading as one continuous jet rather than the
 * whole burst popping and fading in unison every time a held hotkey
 * retriggers it.
 */
function Co2Jet({ id, position, color, height, angle, yaw, width, shape, holdUntil, onDone }: Effect3DProps) {
  const puffRefs = useRef<(Mesh | null)[]>([]);
  const done = useRef(false);
  const mistColor = useMemo(() => CO2_MIST.clone().lerp(new Color(color), 0.2), [color]);
  const direction = useMemo(() => directionFromAngle(angle, yaw), [angle, yaw]);

  const puffs = useMemo(
    () =>
      // Lateral jitter (radius) is kept smaller than the puffs' own size on
      // average so neighbors substantially overlap rather than scattering
      // into a loose, individually-readable cluster — that gap between
      // puff spacing and puff size was the main source of the "bubbles"
      // look even after raising opacity and count alone.
      Array.from({ length: 34 }, (_, i) => ({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * 0.13,
        travelFactor: 0.6 + Math.random() * 0.5,
        phase: (i / 34) * CO2_CYCLE + Math.random() * 0.03,
        driftSpeed: 0.3 + Math.random() * 0.4,
        size: 0.16 + Math.random() * 0.22,
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

      const baseGrowth = 1.3;
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
      mesh.scale.setScalar(1 + travelProgress * 0.85);

      const fadeProgress = Math.max(0, (progress - CO2_FADE_START) / (1 - CO2_FADE_START));
      mat.opacity = attackProgress * Math.max(0, 1 - fadeProgress) * 0.92;
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

const SPARK_CYCLE = 0.9;
const SPARK_APEX_FRACTION = 0.5;

/**
 * Cold-spark fountain (Sparkular): a real cold-spark machine has no solid
 * flame-like body at all — it's a tight, dense column of individual bright
 * streaking particles on a ballistic arc, with a brighter cluster where
 * they're densest near the top. Rebuilt as exactly that: streaks (thin
 * cylinders stretched and rotated along their instantaneous velocity) rise
 * and fall under a simple gravity model derived from `height` and
 * `SPARK_CYCLE` so the arc's apex always lands at the device's configured
 * height, plus a handful of flickering glow points near the peak for the
 * bright burst cluster. Continuous-hold like Co2Jet: streaks loop through
 * their arc for as long as `holdUntil` keeps getting pushed forward.
 */
function SparkJet({ id, position, color, height, angle, yaw, width, holdUntil, onDone }: Effect3DProps) {
  const streakRefs = useRef<(Mesh | null)[]>([]);
  const glowRefs = useRef<(Mesh | null)[]>([]);
  const done = useRef(false);
  const sparkColor = useMemo(() => new Color(color), [color]);
  const direction = useMemo(() => directionFromAngle(angle, yaw), [angle, yaw]);

  // A streak's parabolic arc peaks at exactly `height` halfway through
  // SPARK_CYCLE and lands back at the nozzle exactly as the cycle wraps —
  // so the fountain's visible height always matches the device's
  // configured height regardless of the cycle length chosen for looping.
  const apexTime = SPARK_CYCLE * SPARK_APEX_FRACTION;
  const gravity = (2 * height) / (apexTime * apexTime);
  const v0 = gravity * apexTime;

  const streaks = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        spreadAngle: Math.random() * Math.PI * 2,
        spread: Math.random(),
        phase: (i / 40) * SPARK_CYCLE + Math.random() * 0.02,
        size: 0.012 + Math.random() * 0.012,
      })),
    [],
  );

  const glows = useMemo(
    () =>
      Array.from({ length: 6 }, () => ({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * 0.1,
        heightFrac: 0.85 + Math.random() * 0.25,
        flickerPhase: Math.random() * Math.PI * 2,
        size: 0.035 + Math.random() * 0.025,
      })),
    [],
  );

  useFrame(() => {
    if (done.current) return;
    const now = performance.now();
    const holdUntilSafe = holdUntil ?? now;

    streaks.forEach((s, i) => {
      const mesh = streakRefs.current[i];
      if (!mesh) return;
      const mat = mesh.material as MeshBasicMaterial;

      const local = continuousLocalTime(now, holdUntilSafe, SPARK_CYCLE, s.phase);
      const rise = Math.max(0, v0 * local - 0.5 * gravity * local * local);
      const jitter = Math.min(1, local / apexTime) * width * 0.18 * s.spread;
      mesh.position.set(
        direction.x * rise + Math.cos(s.spreadAngle) * jitter,
        direction.y * rise,
        direction.z * rise + Math.sin(s.spreadAngle) * jitter,
      );

      const speed = Math.abs(v0 - gravity * local);
      mesh.scale.set(s.size, Math.max(0.02, Math.min(0.3, speed * 0.02)), s.size);

      const progress = local / SPARK_CYCLE;
      const brightness = Math.max(0, Math.sin(Math.PI * Math.min(1, progress)));
      mat.color.lerpColors(HOT_WHITE, sparkColor, Math.min(1, progress * 1.3));
      mat.opacity = Math.pow(brightness, 0.6);
    });

    glows.forEach((g, i) => {
      const mesh = glowRefs.current[i];
      if (!mesh) return;
      const mat = mesh.material as MeshBasicMaterial;
      if (now >= holdUntilSafe) {
        mat.opacity = Math.max(0, mat.opacity - 0.05);
        return;
      }
      const flicker = 0.5 + Math.sin(now * 0.02 + g.flickerPhase) * 0.5;
      const riseHeight = height * g.heightFrac;
      mesh.position.set(
        direction.x * riseHeight + Math.cos(g.angle) * g.radius * width,
        direction.y * riseHeight,
        direction.z * riseHeight + Math.sin(g.angle) * g.radius * width,
      );
      mat.opacity = 0.35 + flicker * 0.5;
    });

    if (now - holdUntilSafe > SPARK_CYCLE * 1000 + 100) {
      done.current = true;
      onDone(id);
    }
  });

  return (
    <group position={position}>
      {streaks.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            streakRefs.current[i] = el;
          }}
          geometry={STREAK_GEOMETRY}
        >
          <meshBasicMaterial color={HOT_WHITE} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      {glows.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            glowRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.045, 6, 6]} />
          <meshBasicMaterial color={HOT_WHITE} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
