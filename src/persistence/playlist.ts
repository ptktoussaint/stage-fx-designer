import { del, get, set } from 'idb-keyval';
import type { Project } from '../types';
import { createId } from '../utils/id';
import { migrateProject } from './schema';

/**
 * Autosave (autosave.ts) holds exactly one "current" project. This is a
 * separate library of NAMED shows a user has explicitly saved into it —
 * click one to load it (project + its audio) as the current project, so a
 * playlist of songs can each carry their own saved effects. Each entry's
 * audio blob is stored under its own namespaced key (see playlistAudioKey)
 * for the same reason autosave.ts keeps audio separate from the project
 * JSON: IndexedDB holds a Blob directly, a project JSON can't.
 */
const PLAYLIST_KEY = 'stage-fx-designer:playlist';

export interface PlaylistEntry {
  id: string;
  name: string;
  project: Project;
  savedAt: string;
}

export async function listPlaylistEntries(): Promise<PlaylistEntry[]> {
  const entries = await get<PlaylistEntry[] | undefined>(PLAYLIST_KEY);
  return entries ?? [];
}

export async function savePlaylistEntry(entry: PlaylistEntry): Promise<void> {
  const entries = await listPlaylistEntries();
  const next = [...entries.filter((e) => e.id !== entry.id), entry];
  await set(PLAYLIST_KEY, next);
}

export async function removePlaylistEntry(id: string): Promise<void> {
  const entries = await listPlaylistEntries();
  await set(
    PLAYLIST_KEY,
    entries.filter((e) => e.id !== id),
  );
  await del(playlistAudioKey(id));
}

export function playlistAudioKey(id: string): string {
  return `stage-fx-designer:playlist-audio:${id}`;
}

interface StoredPlaylistAudio {
  fileName: string;
  blob: Blob;
}

export async function savePlaylistAudio(id: string, fileName: string, blob: Blob): Promise<void> {
  await set(playlistAudioKey(id), { fileName, blob } satisfies StoredPlaylistAudio);
}

export async function loadPlaylistAudio(id: string): Promise<StoredPlaylistAudio | null> {
  const stored = await get<StoredPlaylistAudio | undefined>(playlistAudioKey(id));
  return stored ?? null;
}

/**
 * A single portable file bundling every playlist entry (each show's project
 * JSON, plus its audio inlined as base64) — for moving a whole playlist to
 * another machine or handing it to a colleague, as opposed to the single-show
 * .json from handleExport in ProjectPanel. Base64 costs ~33% size over the
 * raw audio bytes; accepted in exchange for staying a single plain-JSON file
 * with no new zip dependency.
 */
export interface PlaylistBundleEntry {
  name: string;
  savedAt: string;
  project: Project;
  audio?: { fileName: string; base64: string };
}

export interface PlaylistBundle {
  version: 1;
  entries: PlaylistBundleEntry[];
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:<mime>;base64," prefix FileReader.readAsDataURL adds.
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes]);
}

export async function exportPlaylistBundle(): Promise<PlaylistBundle> {
  const entries = await listPlaylistEntries();
  const bundleEntries = await Promise.all(
    entries.map(async (entry): Promise<PlaylistBundleEntry> => {
      const audio = await loadPlaylistAudio(entry.id);
      return {
        name: entry.name,
        savedAt: entry.savedAt,
        project: entry.project,
        audio: audio ? { fileName: audio.fileName, base64: await blobToBase64(audio.blob) } : undefined,
      };
    }),
  );
  return { version: 1, entries: bundleEntries };
}

/** Imported entries always get a fresh id rather than trying to reconcile
 * with whatever's already saved locally — simpler, and avoids one machine's
 * import silently overwriting another's differently-named show that just
 * happens to collide on an old id. */
export async function importPlaylistBundle(bundle: PlaylistBundle): Promise<number> {
  for (const entry of bundle.entries) {
    const id = createId();
    // Migrate in case the bundle came from an older build's export — same
    // backfill an "Abrir Arquivo" single-project import already gets.
    const project = migrateProject(entry.project) ?? entry.project;
    await savePlaylistEntry({ id, name: entry.name, project, savedAt: entry.savedAt });
    if (entry.audio) {
      await savePlaylistAudio(id, entry.audio.fileName, base64ToBlob(entry.audio.base64));
    }
  }
  return bundle.entries.length;
}
