import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useUiStore } from '../../stores/uiStore';
import { moveDevices } from '../../commands';
import { getDeviceDefinition } from '../../devices/registry';
import { pixelsPerMeterForZoom, pixelsToMeters } from '../../engine/coordinates';
import { eventBus } from '../../engine/eventBus';
import { snapPosition } from '../../utils/math';
import type { Vector3 } from '../../types';
import { DeviceNode } from './DeviceNode';
import { SelectionBoundingBox } from './SelectionBoundingBox';
import { DistanceOverlay } from './DistanceOverlay';
import { DEVICE_DEFINITION_DRAG_TYPE } from '../fxLibrary/FxLibraryPanel';
import { addDevice } from '../../commands';
import './StageRenderer2D.css';

const CLICK_DRAG_THRESHOLD_PX = 4;

interface DragState {
  deviceIds: string[];
  startMeters: { x: number; y: number };
  startPositions: Map<string, Vector3>;
  moved: boolean;
}

interface BoxSelectState {
  startScreen: { x: number; y: number };
  currentScreen: { x: number; y: number };
  additive: boolean;
}

export function StageRenderer2D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const project = useProjectStore((s) => s.project);
  const { stage, devices, groups, settings } = project;

  const selectedIds = useSelectionStore((s) => s.selectedDeviceIds);
  const selectDevice = useSelectionStore((s) => s.select);
  const toggleDevice = useSelectionStore((s) => s.toggle);
  const setSelection = useSelectionStore((s) => s.setSelection);
  const addToSelection = useSelectionStore((s) => s.addToSelection);
  const clearSelection = useSelectionStore((s) => s.clear);

  const zoom = useUiStore((s) => s.zoom);
  const pan = useUiStore((s) => s.pan);
  const setZoom = useUiStore((s) => s.setZoom);
  const setPan = useUiStore((s) => s.setPan);
  const openContextMenu = useUiStore((s) => s.openContextMenu);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [boxSelect, setBoxSelect] = useState<BoxSelectState | null>(null);
  const [triggeredIds, setTriggeredIds] = useState<Set<string>>(new Set());

  const pixelsPerMeter = pixelsPerMeterForZoom(zoom);

  const toScreen = useCallback(
    (pos: { x: number; y: number }) => ({
      x: pos.x * pixelsPerMeter + pan.x,
      y: pos.y * pixelsPerMeter + pan.y,
    }),
    [pixelsPerMeter, pan],
  );

  const screenToMeters = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const localX = clientX - (rect?.left ?? 0);
      const localY = clientY - (rect?.top ?? 0);
      return {
        x: pixelsToMeters(localX - pan.x, pixelsPerMeter),
        y: pixelsToMeters(localY - pan.y, pixelsPerMeter),
      };
    },
    [pan, pixelsPerMeter],
  );

  // Flash devices briefly when the Simulation Engine fires for them —
  // demonstrates the Timeline/manual-trigger -> Show Engine -> Simulation
  // Engine -> Stage Editor pipeline without a real visual sim yet.
  useEffect(
    () =>
      eventBus.on('SIMULATION_TRIGGER', ({ deviceId }) => {
        setTriggeredIds((prev) => new Set(prev).add(deviceId));
        setTimeout(() => {
          setTriggeredIds((prev) => {
            const next = new Set(prev);
            next.delete(deviceId);
            return next;
          });
        }, 500);
      }),
    [],
  );

  // --- device drag -------------------------------------------------------

  const handleDevicePointerDown = useCallback(
    (e: React.PointerEvent, deviceId: string) => {
      e.stopPropagation();
      const device = devices.find((d) => d.id === deviceId);
      if (!device) return;

      let nextSelection: string[];
      if (e.shiftKey) {
        toggleDevice(deviceId);
        nextSelection = useSelectionStore.getState().selectedDeviceIds;
      } else if (selectedIds.includes(deviceId)) {
        nextSelection = selectedIds;
      } else {
        selectDevice(deviceId);
        nextSelection = [deviceId];
      }

      const draggableIds = nextSelection.filter((id) => !devices.find((d) => d.id === id)?.locked);
      if (draggableIds.length === 0) return;

      const startPositions = new Map<string, Vector3>();
      draggableIds.forEach((id) => {
        const d = devices.find((dv) => dv.id === id);
        if (d) startPositions.set(id, d.position);
      });

      setDragState({
        deviceIds: draggableIds,
        startMeters: screenToMeters(e.clientX, e.clientY),
        startPositions,
        moved: false,
      });
    },
    [devices, selectedIds, selectDevice, toggleDevice, screenToMeters],
  );

  useEffect(() => {
    if (!dragState) return;

    const onMove = (e: PointerEvent) => {
      const current = screenToMeters(e.clientX, e.clientY);
      const dx = current.x - dragState.startMeters.x;
      const dy = current.y - dragState.startMeters.y;
      if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) return;

      const store = useProjectStore.getState();
      const dragSet = new Set(dragState.deviceIds);
      const otherPositions = store.project.devices
        .filter((d) => !dragSet.has(d.id))
        .map((d) => d.position);

      dragState.deviceIds.forEach((id) => {
        const start = dragState.startPositions.get(id);
        if (!start) return;
        const raw = { x: start.x + dx, y: start.y + dy, z: start.z };
        const snapped = snapPosition(raw, stage, settings.snap, otherPositions);
        store._updateDevice(id, { position: snapped });
      });
      dragState.moved = true;
    };

    const onUp = () => {
      if (dragState.moved) {
        const finalDevices = useProjectStore.getState().project.devices;
        const moves = dragState.deviceIds
          .map((id) => {
            const from = dragState.startPositions.get(id);
            const to = finalDevices.find((d) => d.id === id)?.position;
            return from && to ? { deviceId: id, from, to } : null;
          })
          .filter((m): m is { deviceId: string; from: Vector3; to: Vector3 } => m !== null);
        moveDevices(moves);
      }
      setDragState(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragState]);

  // --- box select ----------------------------------------------------------

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const rect = containerRef.current?.getBoundingClientRect();
      const screen = { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
      setBoxSelect({ startScreen: screen, currentScreen: screen, additive: e.shiftKey });
    },
    [],
  );

  useEffect(() => {
    if (!boxSelect) return;

    const onMove = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      setBoxSelect((prev) =>
        prev
          ? { ...prev, currentScreen: { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) } }
          : prev,
      );
    };

    const onUp = () => {
      // Read `boxSelect` from the effect's closure (not via a setState
      // updater) so the selection-store calls below don't fire from inside
      // React's state-update reducer for `boxSelect` itself.
      const prev = boxSelect;
      setBoxSelect(null);
      if (!prev) return;

      const dx = Math.abs(prev.currentScreen.x - prev.startScreen.x);
      const dy = Math.abs(prev.currentScreen.y - prev.startScreen.y);

      if (dx < CLICK_DRAG_THRESHOLD_PX && dy < CLICK_DRAG_THRESHOLD_PX) {
        if (!prev.additive) clearSelection();
        return;
      }

      const x1 = Math.min(prev.startScreen.x, prev.currentScreen.x);
      const x2 = Math.max(prev.startScreen.x, prev.currentScreen.x);
      const y1 = Math.min(prev.startScreen.y, prev.currentScreen.y);
      const y2 = Math.max(prev.startScreen.y, prev.currentScreen.y);

      const hits = devices.filter((d) => {
        const screen = toScreen(d.position);
        return screen.x >= x1 && screen.x <= x2 && screen.y >= y1 && screen.y <= y2;
      });
      const ids = hits.map((d) => d.id);
      if (prev.additive) addToSelection(ids);
      else setSelection(ids);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [boxSelect, devices, toScreen, clearSelection, addToSelection, setSelection]);

  // --- zoom / drop -----------------------------------------------------

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      setZoom(zoom * (1 - e.deltaY * 0.001));
    },
    [zoom, setZoom],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const definitionId = e.dataTransfer.getData(DEVICE_DEFINITION_DRAG_TYPE);
      const definition = getDeviceDefinition(definitionId);
      if (!definition) return;
      const meters = screenToMeters(e.clientX, e.clientY);
      const snapped = snapPosition({ ...meters, z: 0 }, stage, settings.snap, devices.map((d) => d.position));
      const id = addDevice(definition, snapped);
      selectDevice(id);
    },
    [screenToMeters, stage, settings.snap, devices, selectDevice],
  );

  const handleDeviceContextMenu = useCallback(
    (e: React.MouseEvent, deviceId: string) => {
      e.preventDefault();
      if (!selectedIds.includes(deviceId)) selectDevice(deviceId);
      openContextMenu({ x: e.clientX, y: e.clientY, target: { type: 'device', deviceId } });
    },
    [selectedIds, selectDevice, openContextMenu],
  );

  const handleCanvasContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      openContextMenu({ x: e.clientX, y: e.clientY, target: { type: 'stage' } });
    },
    [openContextMenu],
  );

  // --- render --------------------------------------------------------------

  const stageOrigin = toScreen({ x: 0, y: 0 });
  const stageBottomRight = toScreen({ x: stage.width, y: stage.depth });

  const gridLines: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = [];
  for (let x = 0; x <= stage.width + 1e-6; x += stage.gridSize) {
    const p1 = toScreen({ x, y: 0 });
    const p2 = toScreen({ x, y: stage.depth });
    gridLines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, major: Math.round(x) === x });
  }
  for (let y = 0; y <= stage.depth + 1e-6; y += stage.gridSize) {
    const p1 = toScreen({ x: 0, y });
    const p2 = toScreen({ x: stage.width, y });
    gridLines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, major: Math.round(y) === y });
  }

  const selectedDevices = devices.filter((d) => selectedIds.includes(d.id));
  let boundingBox: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
  if (selectedDevices.length > 1) {
    const screens = selectedDevices.map((d) => toScreen(d.position));
    boundingBox = {
      minX: Math.min(...screens.map((s) => s.x)),
      minY: Math.min(...screens.map((s) => s.y)),
      maxX: Math.max(...screens.map((s) => s.x)),
      maxY: Math.max(...screens.map((s) => s.y)),
    };
  }

  return (
    <div
      ref={containerRef}
      className="stage-canvas"
      onPointerDown={handleCanvasPointerDown}
      onWheel={handleWheel}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onContextMenu={handleCanvasContextMenu}
    >
      <svg width="100%" height="100%">
        <rect
          x={stageOrigin.x}
          y={stageOrigin.y}
          width={stageBottomRight.x - stageOrigin.x}
          height={stageBottomRight.y - stageOrigin.y}
          fill="var(--bg-inset)"
        />
        {gridLines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={line.major ? 'var(--border-strong)' : 'var(--border-subtle)'}
            strokeWidth={line.major ? 1 : 0.5}
          />
        ))}
        <rect
          x={stageOrigin.x}
          y={stageOrigin.y}
          width={stageBottomRight.x - stageOrigin.x}
          height={stageBottomRight.y - stageOrigin.y}
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth={1.5}
        />

        {devices.map((device) => {
          const screen = toScreen(device.position);
          return (
            <DeviceNode
              key={device.id}
              device={device}
              pixelsPerMeter={pixelsPerMeter}
              screenX={screen.x}
              screenY={screen.y}
              isSelected={selectedIds.includes(device.id)}
              isTriggered={triggeredIds.has(device.id)}
              onPointerDown={handleDevicePointerDown}
              onContextMenu={handleDeviceContextMenu}
            />
          );
        })}

        {boundingBox && <SelectionBoundingBox {...boundingBox} />}

        {selectedDevices.length === 2 && (
          <DistanceOverlay
            a={selectedDevices[0]}
            b={selectedDevices[1]}
            screenA={toScreen(selectedDevices[0].position)}
            screenB={toScreen(selectedDevices[1].position)}
          />
        )}

        {boxSelect && (
          <rect
            x={Math.min(boxSelect.startScreen.x, boxSelect.currentScreen.x)}
            y={Math.min(boxSelect.startScreen.y, boxSelect.currentScreen.y)}
            width={Math.abs(boxSelect.currentScreen.x - boxSelect.startScreen.x)}
            height={Math.abs(boxSelect.currentScreen.y - boxSelect.startScreen.y)}
            className="stage-canvas__box-select"
          />
        )}
      </svg>

      <div className="stage-canvas__zoom-indicator">{Math.round(zoom * 100)}%</div>
      <div className="stage-canvas__pan-hint">
        {groups.length > 0 ? `${groups.length} group(s)` : ''}
      </div>
      <button
        type="button"
        className="stage-canvas__reset-view"
        onClick={() => {
          setZoom(1);
          setPan({ x: 40, y: 40 });
        }}
      >
        Reset View
      </button>
    </div>
  );
}
