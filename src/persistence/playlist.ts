import { del, get, set } from 'idb-keyval';
import type { Project } from '../types';

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
