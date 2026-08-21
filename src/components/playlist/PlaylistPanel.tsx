import { useEffect, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useHistoryStore } from '../../stores/historyStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useUiStore } from '../../stores/uiStore';
import { audioEngine } from '../../engine/audioEngine';
import { loadAudioBlob, saveAudioBlob } from '../../persistence/audioStorage';
import {
  listPlaylistEntries,
  loadPlaylistAudio,
  removePlaylistEntry,
  savePlaylistAudio,
  savePlaylistEntry,
  type PlaylistEntry,
} from '../../persistence/playlist';
import { IconButton } from '../common/IconButton';
import { createId } from '../../utils/id';
import './PlaylistPanel.css';

/**
 * A library of named shows, each carrying its own saved project (stage,
 * devices, timeline cues) and audio — click one to load it as the current
 * project. Separate from the single-slot autosave (autosave.ts): that one
 * always tracks "whatever's open right now," this is an explicit "save
 * this as a show in my playlist" library the user builds up over time.
 */
export function PlaylistPanel() {
  const project = useProjectStore((s) => s.project);
  const setPlaylistOpen = useUiStore((s) => s.setPlaylistOpen);
  const [entries, setEntries] = useState<PlaylistEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const refresh = () => {
    void listPlaylistEntries().then((list) =>
      setEntries([...list].sort((a, b) => b.savedAt.localeCompare(a.savedAt))),
    );
  };

  useEffect(refresh, []);

  const handleSaveCurrent = async () => {
    const name = window.prompt('Save current show as', project.name);
    if (!name || !name.trim()) return;
    setIsSaving(true);
    try {
      const id = createId();
      await savePlaylistEntry({ id, name: name.trim(), project, savedAt: new Date().toISOString() });
      if (project.audio.fileName) {
        const stored = await loadAudioBlob();
        if (stored) await savePlaylistAudio(id, stored.fileName, stored.blob);
      }
      refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async (entry: PlaylistEntry) => {
    setLoadingId(entry.id);
    try {
      usePlaybackStore.getState().stop();
      audioEngine.clear();
      useProjectStore.getState()._setProject(entry.project);
      useHistoryStore.getState().clear();

      const audio = await loadPlaylistAudio(entry.id);
      if (audio) {
        const arrayBuffer = await audio.blob.arrayBuffer();
        await audioEngine.loadFromArrayBuffer(arrayBuffer, () => usePlaybackStore.getState().stop());
        // Keep the regular autosave slot in sync so a later refresh doesn't
        // lose this show's audio the same way importing a track does.
        await saveAudioBlob(audio.fileName, audio.blob);
      }
      setPlaylistOpen(false);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (entry: PlaylistEntry) => {
    if (!window.confirm(`Remove "${entry.name}" from the playlist? This can't be undone.`)) return;
    await removePlaylistEntry(entry.id);
    refresh();
  };

  return (
    <div className="playlist-panel">
      <button type="button" className="playlist-panel__save-button" onClick={handleSaveCurrent} disabled={isSaving}>
        {isSaving ? 'Saving…' : `Save "${project.name}" to Playlist`}
      </button>

      {entries.length === 0 ? (
        <div className="playlist-panel__empty">
          No shows saved yet. Build a show, then save it here — click it later to reopen it with its
          effects already in place.
        </div>
      ) : (
        <div className="playlist-panel__list">
          {entries.map((entry) => (
            <div key={entry.id} className="playlist-panel__row">
              <button
                type="button"
                className="playlist-panel__row-main"
                onClick={() => handleLoad(entry)}
                disabled={loadingId !== null}
              >
                <span className="playlist-panel__name">{entry.name}</span>
                <span className="playlist-panel__meta">
                  {entry.project.devices.length} device{entry.project.devices.length === 1 ? '' : 's'} ·{' '}
                  {entry.project.timeline.events.length} cue{entry.project.timeline.events.length === 1 ? '' : 's'} ·{' '}
                  {new Date(entry.savedAt).toLocaleDateString()}
                </span>
              </button>
              {loadingId === entry.id ? (
                <span className="playlist-panel__loading">Loading…</span>
              ) : (
                <IconButton icon="trash" label="Remove from Playlist" onClick={() => handleDelete(entry)} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
