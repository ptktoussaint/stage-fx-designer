import type { Command } from './Command';
import { useProjectStore } from '../stores/projectStore';
import { useSelectionStore } from '../stores/selectionStore';
import type { PlatformInstance, Vector3 } from '../types';
import { createId, nextInstanceName } from '../utils/id';

export class AddPlatformCommand implements Command {
  label: string;
  readonly platform: PlatformInstance;

  constructor(name: string, dimensions: PlatformInstance['dimensions'], position: Vector3, color: string) {
    const existingNames = useProjectStore.getState().project.platforms.map((p) => p.name);
    this.platform = {
      id: createId(),
      name: nextInstanceName(name, existingNames),
      position,
      rotation: { z: 0 },
      dimensions,
      color,
      locked: false,
    };
    this.label = `Add ${this.platform.name}`;
  }

  execute() {
    useProjectStore.getState()._addPlatform(this.platform);
  }

  undo() {
    useProjectStore.getState()._removePlatform(this.platform.id);
  }
}

export class RemovePlatformsCommand implements Command {
  label: string;
  private readonly platformIds: string[];
  private readonly prevPlatforms: PlatformInstance[];

  constructor(platformIds: string[]) {
    this.platformIds = platformIds;
    this.prevPlatforms = useProjectStore.getState().project.platforms;
    this.label = platformIds.length > 1 ? `Delete ${platformIds.length} Platforms` : 'Delete Platform';
  }

  execute() {
    useProjectStore.getState()._removePlatforms(this.platformIds);
    useSelectionStore.getState().clear();
  }

  undo() {
    const store = useProjectStore.getState();
    store._setProject({ ...store.project, platforms: this.prevPlatforms });
  }
}

export class MovePlatformCommand implements Command {
  label: string;
  private readonly platformId: string;
  private readonly from: Vector3;
  private to: Vector3;

  constructor(platformId: string, from: Vector3, to: Vector3) {
    this.platformId = platformId;
    this.from = from;
    this.to = to;
    this.label = 'Move Platform';
  }

  execute() {
    useProjectStore.getState()._updatePlatform(this.platformId, { position: this.to });
  }

  undo() {
    useProjectStore.getState()._updatePlatform(this.platformId, { position: this.from });
  }

  mergeWith(next: Command): Command | null {
    if (!(next instanceof MovePlatformCommand) || next.platformId !== this.platformId) return null;
    return new MovePlatformCommand(this.platformId, this.from, next.to);
  }
}

export class UpdatePlatformCommand implements Command {
  label: string;
  private readonly platformId: string;
  private readonly patchBefore: Partial<PlatformInstance>;
  private readonly patchAfter: Partial<PlatformInstance>;

  constructor(
    platformId: string,
    patchBefore: Partial<PlatformInstance>,
    patchAfter: Partial<PlatformInstance>,
    label = 'Edit Platform',
  ) {
    this.platformId = platformId;
    this.patchBefore = patchBefore;
    this.patchAfter = patchAfter;
    this.label = label;
  }

  execute() {
    useProjectStore.getState()._updatePlatform(this.platformId, this.patchAfter);
  }

  undo() {
    useProjectStore.getState()._updatePlatform(this.platformId, this.patchBefore);
  }
}
