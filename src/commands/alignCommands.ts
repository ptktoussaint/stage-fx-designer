import type { Command } from './Command';
import { useProjectStore } from '../stores/projectStore';
import type { Vector3 } from '../types';

export type AlignMode = 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom';
export type DistributeAxis = 'horizontal' | 'vertical';

function computeAlignedPositions(
  positions: Map<string, Vector3>,
  mode: AlignMode,
): Map<string, Vector3> {
  const values = Array.from(positions.values());
  const next = new Map<string, Vector3>();

  const minX = Math.min(...values.map((p) => p.x));
  const maxX = Math.max(...values.map((p) => p.x));
  const minY = Math.min(...values.map((p) => p.y));
  const maxY = Math.max(...values.map((p) => p.y));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  positions.forEach((pos, id) => {
    switch (mode) {
      case 'left':
        next.set(id, { ...pos, x: minX });
        break;
      case 'right':
        next.set(id, { ...pos, x: maxX });
        break;
      case 'center-x':
        next.set(id, { ...pos, x: centerX });
        break;
      case 'top':
        next.set(id, { ...pos, y: minY });
        break;
      case 'bottom':
        next.set(id, { ...pos, y: maxY });
        break;
      case 'center-y':
        next.set(id, { ...pos, y: centerY });
        break;
    }
  });
  return next;
}

function computeDistributedPositions(
  positions: Map<string, Vector3>,
  axis: DistributeAxis,
): Map<string, Vector3> {
  const entries = Array.from(positions.entries());
  const axisKey = axis === 'horizontal' ? 'x' : 'y';
  const sorted = [...entries].sort((a, b) => a[1][axisKey] - b[1][axisKey]);
  const next = new Map<string, Vector3>();
  if (sorted.length < 3) {
    entries.forEach(([id, pos]) => next.set(id, pos));
    return next;
  }
  const min = sorted[0][1][axisKey];
  const max = sorted[sorted.length - 1][1][axisKey];
  const step = (max - min) / (sorted.length - 1);
  sorted.forEach(([id, pos], index) => {
    next.set(id, { ...pos, [axisKey]: min + step * index });
  });
  return next;
}

/**
 * Shared undo/redo mechanics for "reposition a set of devices" commands.
 * Composition (an injected `computeNext`) rather than an abstract base
 * class, since this project's TS config runs with erasableSyntaxOnly and
 * abstract members aren't erasable syntax.
 */
class RepositionCommand implements Command {
  label: string;
  private deviceIds: string[];
  private computeNext: (before: Map<string, Vector3>) => Map<string, Vector3>;
  private before = new Map<string, Vector3>();
  private after = new Map<string, Vector3>();

  constructor(
    label: string,
    deviceIds: string[],
    computeNext: (before: Map<string, Vector3>) => Map<string, Vector3>,
  ) {
    this.label = label;
    this.deviceIds = deviceIds;
    this.computeNext = computeNext;
  }

  private capture(): Map<string, Vector3> {
    const { devices } = useProjectStore.getState().project;
    const positions = new Map<string, Vector3>();
    devices
      .filter((d) => this.deviceIds.includes(d.id))
      .forEach((d) => positions.set(d.id, d.position));
    return positions;
  }

  execute() {
    if (this.before.size === 0) {
      this.before = this.capture();
      this.after = this.computeNext(this.before);
    }
    const store = useProjectStore.getState();
    this.after.forEach((pos, id) => store._updateDevice(id, { position: pos }));
  }

  undo() {
    const store = useProjectStore.getState();
    this.before.forEach((pos, id) => store._updateDevice(id, { position: pos }));
  }
}

export class AlignDevicesCommand extends RepositionCommand {
  constructor(deviceIds: string[], mode: AlignMode) {
    super(`Alinhar (${mode})`, deviceIds, (before) => computeAlignedPositions(before, mode));
  }
}

export class DistributeDevicesCommand extends RepositionCommand {
  constructor(deviceIds: string[], axis: DistributeAxis) {
    super(`Distribuir ${axis === 'horizontal' ? 'horizontalmente' : 'verticalmente'}`, deviceIds, (before) => computeDistributedPositions(before, axis));
  }
}
