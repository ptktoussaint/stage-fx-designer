import { del, get, set } from 'idb-keyval';

/**
 * The audio file is stored separately from the project document (see
 * autosave.ts): IndexedDB can hold a Blob directly, but a blob: object URL
 * embedded in the project JSON would be dead on the next page load. This
 * module is the only place that persists/restores the raw audio bytes.
 */
const AUDIO_BLOB_KEY = 'stage-fx-designer:audio-blob';

interface StoredAudio {
  fileName: string;
  blob: Blob;
}

export async function saveAudioBlob(fileName: string, blob: Blob): Promise<void> {
  const payload: StoredAudio = { fileName, blob };
  await set(AUDIO_BLOB_KEY, payload);
}

export async function loadAudioBlob(): Promise<StoredAudio | null> {
  const stored = await get<StoredAudio | undefined>(AUDIO_BLOB_KEY);
  return stored ?? null;
}

export async function clearAudioBlob(): Promise<void> {
  await del(AUDIO_BLOB_KEY);
}
