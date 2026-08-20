import { get, set } from 'idb-keyval';
import type { Project } from '../types';
import { migrateProject } from './schema';

/**
 * MVP autosave target: IndexedDB (via idb-keyval) rather than localStorage.
 * Projects will contain many devices + timeline events and, soon, audio
 * blob references — comfortably past what localStorage's ~5MB synchronous
 * string quota should hold. IndexedDB is async and scales to much larger
 * payloads, which also makes it the natural stepping stone toward a future
 * cloud-sync layer (same document shape, different transport).
 */
const AUTOSAVE_KEY = 'stage-fx-designer:autosave';

export async function saveProjectToLocal(project: Project): Promise<void> {
  await set(AUTOSAVE_KEY, project);
}

export async function loadProjectFromLocal(): Promise<Project | null> {
  const raw = await get<unknown>(AUTOSAVE_KEY);
  if (!raw) return null;
  return migrateProject(raw);
}

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number,
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}
