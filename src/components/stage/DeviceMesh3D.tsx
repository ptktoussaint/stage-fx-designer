import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Color } from 'three';
import type { DeviceCategory, DeviceInstance, Vector3 } from '../../types';
import { getDeviceDefinition } from '../../devices/registry';
import { CATEGORY_COLOR_HEX } from '../../devices/categoryColors';
import { useSelectionStore } from '../../stores/selectionStore';

interface DeviceMesh3DProps {
  device: DeviceInstance;
  onDragStart: (kind: 'device', id: string, position: Vector3) => void;
}

const CHROME = '#c7cad1';
const DARK_TRIM = '#1c1d20';

/** A D-shaped loop handle like the ones on real FX machine housings — a
 * half-torus arc, standing on its two ends. */
function LoopHandle({ position, width }: { position: [number, number, number]; width: number }) {
  return (
    <mesh position={position} rotation={[0, 0, 0]} castShadow>
      <torusGeometry args={[width / 2, 0.008, 6, 16, Math.PI]} />
      <meshStandardMaterial color={CHROME} metalness={0.6} roughness={0.35} />
    </mesh>
  );
}

/** Magic FX "Stage Flame"-style unit: a squat black box with two loop
 * handles on top and a round nozzle turret centered on top. */
function FireMachine({ color }: { color: Color }) {
  return (
    <group>
      <mesh position={[0, 0.11, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.34, 0.22, 0.32]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <LoopHandle position={[-0.1, 0.24, 0]} width={0.1} />
      <LoopHandle position={[0.1, 0.24, 0]} width={0.1} />
      <mesh position={[0, 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.05, 16]} />
        <meshStandardMaterial color={DARK_TRIM} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.275, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.05, 0.03, 16]} />
        <meshStandardMaterial color="#2a2a2e" metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** "CO2 Jet"-style unit: a flat base plate, a small control body with two
 * knobs, and the tall vertical jet tube. */
function Co2Jet({ color }: { color: Color }) {
  return (
    <group>
      <mesh position={[0, 0.01, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.22, 0.02, 0.16]} />
        <meshStandardMaterial color={DARK_TRIM} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.13, 0]} castShadow>
        <boxGeometry args={[0.11, 0.22, 0.11]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[-0.065, 0.15, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.02, 10]} />
        <meshStandardMaterial color={CHROME} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.065, 0.15, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.02, 10]} />
        <meshStandardMaterial color={CHROME} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.05, 0.42, 14]} />
        <meshStandardMaterial color="#0e0e10" roughness={0.6} />
      </mesh>
    </group>
  );
}

/** "S-PRO Sparking Stage Effect Machine"-style unit: taller box than the
 * flame machine, one handle, and a capped port on top. */
function SparkMachine({ color }: { color: Color }) {
  return (
    <group>
      <mesh position={[0, 0.13, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.32, 0.26, 0.3]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.26, -0.09]} castShadow>
        <boxGeometry args={[0.26, 0.005, 0.1]} />
        <meshStandardMaterial color={DARK_TRIM} roughness={0.4} />
      </mesh>
      <LoopHandle position={[0, 0.29, 0.02]} width={0.14} />
      <mesh position={[0, 0.26, 0.05]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.03, 16]} />
        <meshStandardMaterial color={DARK_TRIM} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.285, 0.05]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.02, 16]} />
        <meshStandardMaterial color="#2a2a2e" metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Firework "cake" tube (Mines/Micro Mines/Comet/Micro Comets): a small
 * hexagonal-profile cylinder standing upright, like the reference photo. */
function PyroTube({ color }: { color: Color }) {
  return (
    <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.055, 0.055, 0.28, 6]} />
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  );
}

/** Not covered by a reference photo — extrapolated to match the same
 * "black box unit" visual language as fire/spark: a wide low haze/fog
 * machine body with a front vent. */
function AtmosphericMachine({ color }: { color: Color }) {
  return (
    <group>
      <mesh position={[0, 0.09, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 0.18, 0.2]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.09, 0.11]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.02, 16]} />
        <meshStandardMaterial color={DARK_TRIM} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Not covered by a reference photo — extrapolated: a short cannon barrel
 * angled upward on a small base, matching a confetti launcher's silhouette. */
function ConfettiCannon({ color }: { color: Color }) {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.16, 0.1, 0.16]} />
        <meshStandardMaterial color={DARK_TRIM} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 5, 0, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 0.32, 14]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
    </group>
  );
}

const CATEGORY_MODEL: Record<DeviceCategory, (props: { color: Color }) => React.JSX.Element> = {
  FIRE: FireMachine,
  CO2: Co2Jet,
  SPARK: SparkMachine,
  PYRO_SIMULATION: PyroTube,
  ATMOSPHERIC: AtmosphericMachine,
  CONFETTI: ConfettiCannon,
};

/**
 * Realistic-ish stand-ins modeled after real FX machine photos (Magic FX
 * Stage Flame, a CO2 jet, an S-PRO sparkular, a firework cake tube) rather
 * than a generic cone — primitive-composed, not photoreal, but each
 * category reads as its real equipment at true scale. `device.color`
 * overrides the category default on the primary body, same as
 * platforms/figures.
 */
export function DeviceMesh3D({ device, onDragStart }: DeviceMesh3DProps) {
  const definition = getDeviceDefinition(device.definitionId);
  const isSelected = useSelectionStore((s) => s.selectedDeviceIds.includes(device.id));
  const select = useSelectionStore((s) => s.select);
  const toggle = useSelectionStore((s) => s.toggle);

  const color = useMemo(() => {
    const base = new Color(device.color ?? CATEGORY_COLOR_HEX[definition?.category ?? 'ATMOSPHERIC']);
    // No per-mesh opacity plumbing through every category model — dimming
    // the shared body color toward grey reads as "powered off" just as
    // clearly and applies uniformly regardless of which model is active.
    return device.enabled ? base : base.clone().lerp(new Color('#3a3a3e'), 0.6);
  }, [device.color, definition?.category, device.enabled]);

  if (!definition) return null;

  const position: [number, number, number] = [device.position.x, device.position.z, device.position.y];
  const Model = CATEGORY_MODEL[definition.category];

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.shiftKey) toggle(device.id);
    else select(device.id);
    if (!device.locked) onDragStart('device', device.id, device.position);
  };

  return (
    <group position={position} rotation={[0, (-device.rotation.z * Math.PI) / 180, 0]} onPointerDown={handlePointerDown}>
      <Model color={color} />
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.32, 0.4, 24]} />
        <meshBasicMaterial color={isSelected ? '#4f8cff' : color} transparent opacity={isSelected ? 0.9 : 0.35} />
      </mesh>
      {device.locked && (
        <mesh position={[0, 0.75, 0]}>
          <boxGeometry args={[0.12, 0.12, 0.12]} />
          <meshBasicMaterial color="#63656c" />
        </mesh>
      )}
    </group>
  );
}
