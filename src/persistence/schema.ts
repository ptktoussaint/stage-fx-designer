import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_AUDIO_CONFIG,
  DEFAULT_FIGURE_COLOR,
  DEFAULT_PROJECT_SETTINGS,
  type Project,
} from '../types';
import { DEFAULT_STAGE_CONFIG } from '../types/stage';
import { createId } from '../utils/id';

/**
 * Every persisted project carries schemaVersion, for future STRUCTURAL
 * changes (renaming/moving/reshaping existing data — add a `case N:` step
 * below that mutates the document forward one version at a time, never
 * rewriting older cases).
 *
 * Separately — and this is the part that actually matters day to day —
 * this function backfills any field that's simply NEW since a project was
 * last saved (e.g. AudioConfig.trimStart, Project.hotkeys), by merging the
 * loaded document over fresh defaults. Without this, a project saved by an
 * older build loads with those fields `undefined` and crashes the first
 * component that calls a method on one (this is exactly the bug that
 * shipped: TimelineTrimHandles calling `.toFixed()` on a missing
 * `trimStart`). Every new top-level or nested field added to the Project
 * shape needs a line here, not just a TypeScript type change.
 */
export function migrateProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== 'object') return null;
  const doc = raw as Partial<Project>;

  let version = doc.schemaVersion ?? 0;
  // eslint-disable-next-line no-constant-condition
  while (version < CURRENT_SCHEMA_VERSION) {
    switch (version) {
      // case 0: /* v0 -> v1 migration would go here */ version = 1; break;
      default:
        version = CURRENT_SCHEMA_VERSION;
    }
  }

  return {
    id: doc.id ?? createId(),
    name: doc.name ?? 'Show Sem Título',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: doc.createdAt ?? new Date().toISOString(),
    updatedAt: doc.updatedAt ?? new Date().toISOString(),
    stage: { ...DEFAULT_STAGE_CONFIG, ...doc.stage },
    devices: doc.devices ?? [],
    platforms: doc.platforms ?? [],
    figures: (doc.figures ?? []).map((figure) => ({ ...figure, color: figure.color ?? DEFAULT_FIGURE_COLOR })),
    groups: doc.groups ?? [],
    audio: { ...DEFAULT_AUDIO_CONFIG, ...doc.audio },
    timeline: {
      events: doc.timeline?.events ?? [],
      folders: doc.timeline?.folders ?? [],
      trackOrder: doc.timeline?.trackOrder ?? [],
      trackFolder: doc.timeline?.trackFolder ?? {},
    },
    settings: {
      ...DEFAULT_PROJECT_SETTINGS,
      ...doc.settings,
      snap: { ...DEFAULT_PROJECT_SETTINGS.snap, ...doc.settings?.snap },
    },
    hotkeys: doc.hotkeys ?? [],
  };
}
