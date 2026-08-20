import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import { useProjectStore } from '../../stores/projectStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { DeviceMesh3D } from './DeviceMesh3D';
import { SimulationEffects3D } from './SimulationEffects3D';
import './StageRenderer2D.css';

/**
 * Real 3D stage view. Reads the exact same Project.devices as the 2D
 * renderer — x/y/z in meters, no separate data model — per the
 * "renderer-agnostic model" requirement (see ARCHITECTURE.md §8).
 *
 * Coordinate mapping (project -> three.js, Y-up):
 *   three.x = project.x (horizontal)
 *   three.y = project.z (height/elevation)
 *   three.z = project.y (depth from the front of the stage)
 */
export function StageRenderer3D() {
  const devices = useProjectStore((s) => s.project.devices);
  const stage = useProjectStore((s) => s.project.stage);
  const clearSelection = useSelectionStore((s) => s.clear);

  const cameraPosition = useMemo<[number, number, number]>(() => {
    const span = Math.max(stage.width, stage.depth);
    return [stage.width / 2, span * 0.75, -span * 0.85];
  }, [stage.width, stage.depth]);

  const target = useMemo<[number, number, number]>(
    () => [stage.width / 2, 0, stage.depth / 2],
    [stage.width, stage.depth],
  );

  return (
    <div className="stage-renderer-3d">
      <Canvas
        shadows
        camera={{ position: cameraPosition, fov: 45, near: 0.1, far: 500 }}
        onPointerMissed={() => clearSelection()}
      >
        <color attach="background" args={['#0c0d0f']} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[stage.width * 0.4, 12, -stage.depth * 0.3]} intensity={0.9} castShadow />

        <mesh
          position={[stage.width / 2, -0.01, stage.depth / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
          onClick={() => clearSelection()}
        >
          <planeGeometry args={[stage.width, stage.depth]} />
          <meshStandardMaterial color="#141518" />
        </mesh>

        <Grid
          position={[stage.width / 2, 0, stage.depth / 2]}
          args={[stage.width, stage.depth]}
          cellSize={stage.gridSize}
          cellThickness={0.5}
          cellColor="#26272c"
          sectionSize={Math.max(stage.gridSize * 4, 1)}
          sectionThickness={1}
          sectionColor="#34363d"
          fadeDistance={Math.max(stage.width, stage.depth) * 2}
          infiniteGrid={false}
        />

        {devices.map((device) => (
          <DeviceMesh3D key={device.id} device={device} />
        ))}

        <SimulationEffects3D />

        <OrbitControls
          target={target}
          minDistance={2}
          maxDistance={Math.max(stage.width, stage.depth) * 3}
          maxPolarAngle={Math.PI / 2 - 0.02}
        />
      </Canvas>
    </div>
  );
}
