import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useProjectStore } from '../../stores/projectStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useUiStore } from '../../stores/uiStore';
import { moveDevice, movePlatform, moveFigure } from '../../commands';
import { snapPosition } from '../../utils/math';
import type { Vector3 } from '../../types';
import { DeviceMesh3D } from './DeviceMesh3D';
import { PlatformMesh3D } from './PlatformMesh3D';
import { FigureMesh3D } from './FigureMesh3D';
import { SimulationEffects3D } from './SimulationEffects3D';
import { offlineRenderRoot } from '../../engine/offlineRenderRoot';
import './StageRenderer2D.css';

interface DragState3D {
  kind: 'device' | 'platform' | 'figure';
  id: string;
  startPosition: Vector3;
}

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
  const platforms = useProjectStore((s) => s.project.platforms);
  const figures = useProjectStore((s) => s.project.figures);
  const stage = useProjectStore((s) => s.project.stage);
  const snap = useProjectStore((s) => s.project.settings.snap);
  const clearSelection = useSelectionStore((s) => s.clear);

  const isClipRecording = useUiStore((s) => s.isClipRecording);

  const [dragState, setDragState] = useState<DragState3D | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  // preserveDrawingBuffer (needed only by the manual live "Record Clip"
  // button's canvas.captureStream() capture — the offline renderer grabs
  // frames synchronously right after its own render call and never needs
  // it) can only be set at WebGL context creation, so toggling it means
  // remounting the Canvas. That would normally reset the camera to its
  // default framing right when someone starts recording — this ref keeps
  // the last orbited position/target so the remount can restore it instead.
  const savedCameraRef = useRef<{ position: [number, number, number]; target: [number, number, number] } | null>(
    null,
  );
  // Whether the current drag actually moved anything, tracked outside React
  // state (a ref, not a mutated useState value) so every pointer-move
  // doesn't need to trigger a re-render — the live position update during
  // drag flows through the project store instead, same split used by the
  // 2D drag handlers in StageRenderer2D.
  const movedRef = useRef(false);

  // OrbitControls listens on the canvas's native DOM events directly, so an
  // object's onPointerDown calling stopPropagation() (r3f's own event
  // system) does NOT stop it from also starting a camera orbit — they'd
  // otherwise fight over the same drag gesture. Disable orbiting for the
  // duration of an object drag instead.
  useEffect(() => {
    if (controlsRef.current) controlsRef.current.enabled = !dragState;
  }, [dragState]);

  useEffect(() => () => offlineRenderRoot.set(null), []);

  const handleDragStart = (kind: DragState3D['kind'], id: string, position: Vector3) => {
    movedRef.current = false;
    setDragState({ kind, id, startPosition: position });
  };

  const handleDragPlanePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragState) return;
    e.stopPropagation();
    const raw = { x: e.point.x, y: e.point.z, z: dragState.startPosition.z };
    const store = useProjectStore.getState();
    const snapped = snapPosition(raw, stage, snap, store.project.devices.map((d) => d.position));
    if (dragState.kind === 'device') store._updateDevice(dragState.id, { position: snapped });
    else if (dragState.kind === 'platform') store._updatePlatform(dragState.id, { position: snapped });
    else store._updateFigure(dragState.id, { position: snapped });
    movedRef.current = true;
  };

  useEffect(() => {
    if (!dragState) return;
    const onUp = () => {
      if (movedRef.current) {
        const store = useProjectStore.getState();
        if (dragState.kind === 'device') {
          const final = store.project.devices.find((d) => d.id === dragState.id);
          if (final) moveDevice(dragState.id, dragState.startPosition, final.position);
        } else if (dragState.kind === 'platform') {
          const final = store.project.platforms.find((p) => p.id === dragState.id);
          if (final) movePlatform(dragState.id, dragState.startPosition, final.position);
        } else {
          const final = store.project.figures.find((f) => f.id === dragState.id);
          if (final) moveFigure(dragState.id, dragState.startPosition, final.position);
        }
      }
      setDragState(null);
    };
    window.addEventListener('pointerup', onUp, { once: true });
    return () => window.removeEventListener('pointerup', onUp);
  }, [dragState]);

  const cameraPosition = useMemo<[number, number, number]>(() => {
    const span = Math.max(stage.width, stage.depth + stage.frontMargin);
    return [stage.width / 2, span * 0.75 + stage.height, -span * 0.85 - stage.frontMargin * 0.5];
  }, [stage.width, stage.depth, stage.height, stage.frontMargin]);

  const target = useMemo<[number, number, number]>(
    () => [stage.width / 2, 0, stage.depth / 2],
    [stage.width, stage.depth],
  );

  return (
    <div className="stage-renderer-3d">
      <Canvas
        // Remounts (fresh WebGL context) only when a live recording starts
        // or ends — preserveDrawingBuffer can only be set at context
        // creation. Everything else about the scene is unaffected; the
        // camera position is restored from savedCameraRef below so this
        // doesn't visibly reset the view.
        key={isClipRecording ? 'record' : 'live'}
        camera={{ position: savedCameraRef.current?.position ?? cameraPosition, fov: 45, near: 0.1, far: 500 }}
        onPointerMissed={() => clearSelection()}
        // Capped dpr: at 2-3x (common on retina/4K screens) every fragment
        // shader runs 4-9x more often for no visible gain on a stylized
        // scene like this one — a major, easy win for frame time.
        dpr={[1, 1.5]}
        gl={{
          // Ask the browser/driver for the discrete/high-performance GPU
          // instead of whatever it defaults to (often integrated graphics
          // on laptops with switchable graphics).
          powerPreference: 'high-performance',
          // Only the manual live "Record Clip" button needs this (it reads
          // the canvas via canvas.captureStream() on the browser's own
          // timer, so it needs the drawing buffer to survive between
          // frames) — left on unconditionally it costs an extra buffer copy
          // every frame, always, whether or not anyone is recording. The
          // offline show renderer (engine/offlineShowRenderer.ts) doesn't
          // need it at all: it grabs each VideoFrame synchronously right
          // after its own render call, before anything could clear it.
          preserveDrawingBuffer: isClipRecording,
        }}
        // Hands the root state to the offline show renderer (engine/
        // offlineShowRenderer.ts), which drives this same canvas with a
        // virtual clock (frameloop 'never' + advance()) to render a video
        // far faster than real playback speed.
        onCreated={(state) => {
          offlineRenderRoot.set(state);
        }}
      >
        <color attach="background" args={['#0c0d0f']} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[stage.width * 0.4, 12, -stage.depth * 0.3]} intensity={0.9} />

        {/* Stage deck: a real riser box of height stage.height, top face at
            y=0 so existing device.position.z=0 still means "resting on the
            stage surface" — device Z stays independent of this box, it's a
            visual-only elevation. */}
        <mesh
          position={[stage.width / 2, -stage.height / 2, stage.depth / 2]}


          onClick={() => clearSelection()}
        >
          <boxGeometry args={[stage.width, stage.height, stage.depth]} />
          <meshStandardMaterial color={stage.color} />
        </mesh>

        {stage.frontMargin > 0 && (
          <mesh
            position={[stage.width / 2, -stage.height, -stage.frontMargin / 2]}
            rotation={[-Math.PI / 2, 0, 0]}

            onClick={() => clearSelection()}
          >
            <planeGeometry args={[stage.width, stage.frontMargin]} />
            <meshStandardMaterial color="#182620" />
          </mesh>
        )}

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

        {platforms.map((platform) => (
          <PlatformMesh3D
            key={platform.id}
            platform={platform}
            stageHeight={stage.height}
            onDragStart={handleDragStart}
          />
        ))}

        {figures.map((figure) => (
          <FigureMesh3D key={figure.id} figure={figure} stageHeight={stage.height} onDragStart={handleDragStart} />
        ))}

        {devices.map((device) => (
          <DeviceMesh3D key={device.id} device={device} stageHeight={stage.height} onDragStart={handleDragStart} />
        ))}

        <SimulationEffects3D />

        {/* Invisible drag plane: while an object is being dragged, pointer
            moves raycast against this instead of the visible geometry, and
            the world-space intersection point becomes the object's new x/y
            (project space). Only present during a drag so it never steals
            clicks the rest of the time. Sits 1mm above the dragged object's
            own elevation — coplanar with the stage deck's top face
            otherwise, which made raycast hits ambiguous (could resolve to
            either surface depending on float rounding). */}
        {dragState && (
          <mesh
            position={[stage.width / 2, dragState.startPosition.z + 0.001, stage.depth / 2]}
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerMove={handleDragPlanePointerMove}
          >
            <planeGeometry args={[2000, 2000]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        )}

        <OrbitControls
          ref={controlsRef}
          target={savedCameraRef.current?.target ?? target}
          minDistance={2}
          maxDistance={Math.max(stage.width, stage.depth + stage.frontMargin) * 3}
          maxPolarAngle={Math.PI / 2 - 0.02}
          onChange={() => {
            const controls = controlsRef.current;
            if (!controls) return;
            const cam = controls.object;
            savedCameraRef.current = {
              position: [cam.position.x, cam.position.y, cam.position.z],
              target: [controls.target.x, controls.target.y, controls.target.z],
            };
          }}
        />
      </Canvas>
    </div>
  );
}
