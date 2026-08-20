import type { ThreeEvent } from '@react-three/fiber';
import type { FigureInstance } from '../../types';
import { getFigureDefinition } from '../../figures/registry';
import { useSelectionStore } from '../../stores/selectionStore';

interface FigureMesh3DProps {
  figure: FigureInstance;
}

const PERSON_COLOR = '#c98b5e';
const INSTRUMENT_COLOR = '#8a6b4a';

/** Person markers: a humanoid capsule + head, scaled to the definition's
 * real heightMeters. Instrument markers: simple primitives shaped roughly
 * like the real object (a guitar reads as a guitar, a drum kit as a
 * cluster of drums) — placeholders, not models, but recognizable and at
 * true scale, matching the "looks like the real thing" ask for FX props. */
function PersonMarker({ heightMeters, color }: { heightMeters: number; color: string }) {
  const legHeight = heightMeters * 0.45;
  const bodyLength = heightMeters * 0.35;
  const headRadius = heightMeters * 0.09;
  const radius = heightMeters * 0.11;

  return (
    <group>
      <mesh position={[0, legHeight + bodyLength / 2, 0]} castShadow>
        <capsuleGeometry args={[radius, bodyLength, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, legHeight, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.8, radius * 0.8, legHeight, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, legHeight + bodyLength + headRadius, 0]} castShadow>
        <sphereGeometry args={[headRadius, 12, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function InstrumentMarker({ definitionId, heightMeters }: { definitionId: string; heightMeters: number }) {
  switch (definitionId) {
    case 'figure-guitar':
      return (
        <group>
          <mesh position={[0, heightMeters * 0.3, 0]} rotation={[0, 0, Math.PI / 10]} castShadow>
            <boxGeometry args={[0.32, 0.42, 0.08]} />
            <meshStandardMaterial color={INSTRUMENT_COLOR} />
          </mesh>
          <mesh position={[0.02, heightMeters * 0.65, 0]} rotation={[0, 0, Math.PI / 10]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, heightMeters * 0.6, 8]} />
            <meshStandardMaterial color="#3a2a1a" />
          </mesh>
        </group>
      );
    case 'figure-drum-kit':
      return (
        <group>
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.5, 16]} />
            <meshStandardMaterial color={INSTRUMENT_COLOR} />
          </mesh>
          <mesh position={[-0.4, 0.55, -0.2]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.3, 12]} />
            <meshStandardMaterial color={INSTRUMENT_COLOR} />
          </mesh>
          <mesh position={[0.4, 0.55, -0.2]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.3, 12]} />
            <meshStandardMaterial color={INSTRUMENT_COLOR} />
          </mesh>
          <mesh position={[0, 0.85, -0.5]} rotation={[Math.PI / 2.5, 0, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.02, 16]} />
            <meshStandardMaterial color="#e8d9c0" />
          </mesh>
        </group>
      );
    case 'figure-keyboard':
      return (
        <group>
          <mesh position={[0, heightMeters * 0.85, 0]} castShadow>
            <boxGeometry args={[1.2, 0.08, 0.4]} />
            <meshStandardMaterial color="#1c1c1e" />
          </mesh>
          {[-0.5, 0.5].map((dx) => (
            <mesh key={dx} position={[dx, heightMeters * 0.42, 0]} castShadow>
              <boxGeometry args={[0.06, heightMeters * 0.84, 0.35]} />
              <meshStandardMaterial color="#3a3a3e" />
            </mesh>
          ))}
        </group>
      );
    default:
      return (
        <group>
          <mesh position={[0, heightMeters * 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, heightMeters * 0.9, 6]} />
            <meshStandardMaterial color="#3a3a3e" />
          </mesh>
          <mesh position={[0, heightMeters * 0.95, 0]} castShadow>
            <sphereGeometry args={[0.05, 10, 10]} />
            <meshStandardMaterial color="#1c1c1e" />
          </mesh>
        </group>
      );
  }
}

export function FigureMesh3D({ figure }: FigureMesh3DProps) {
  const definition = getFigureDefinition(figure.definitionId);
  const isSelected = useSelectionStore((s) => s.selectedFigureIds.includes(figure.id));
  const selectFigure = useSelectionStore((s) => s.selectFigure);

  if (!definition) return null;

  const position: [number, number, number] = [figure.position.x, figure.position.z, figure.position.y];
  const color = figure.color ?? PERSON_COLOR;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectFigure(figure.id);
  };

  return (
    <group position={position} rotation={[0, (-figure.rotation.z * Math.PI) / 180, 0]} onClick={handleClick}>
      {definition.category === 'INSTRUMENT' ? (
        <InstrumentMarker definitionId={definition.id} heightMeters={definition.heightMeters} />
      ) : (
        <PersonMarker heightMeters={definition.heightMeters} color={color} />
      )}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[definition.footprint.width * 0.6, definition.footprint.width * 0.75, 24]} />
          <meshBasicMaterial color="#4f8cff" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}
