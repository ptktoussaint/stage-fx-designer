import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useProjectStore, createEmptyProject } from '../../stores/projectStore';
import { useHistoryStore } from '../../stores/historyStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useUiStore } from '../../stores/uiStore';
import { audioEngine } from '../../engine/audioEngine';
import { loadAudioBlob, saveAudioBlob } from '../../persistence/audioStorage';
import { saveProjectToLocal } from '../../persistence/autosave';
import { migrateProject } from '../../persistence/schema';
import {
  exportPlaylistBundle,
  importPlaylistBundle,
  listPlaylistEntries,
  loadPlaylistAudio,
  removePlaylistEntry,
  savePlaylistAudio,
  savePlaylistEntry,
  type PlaylistBundle,
  type PlaylistEntry,
} from '../../persistence/playlist';
import { IconButton } from '../common/IconButton';
import { createId } from '../../utils/id';
import './ProjectPanel.css';

/**
 * Everything about getting a show's data in and out of the app, in one
 * place: the current project (new/open/save/export as a single .json) and
 * the playlist (a library of several shows — each its own song + effects —
 * saved for quick reload, with the whole library portable as one bundle
 * file). Replaces the old scattered New/Open/Save/Export toolbar icons plus
 * a separate "Playlist" modal, which read as two unrelated features even
 * though both are really "save/load a show."
 */
export function ProjectPanel() {
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s._setProject);
  const setProjectPanelOpen = useUiStore((s) => s.setProjectPanelOpen);

  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const bundleFileInputRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<PlaylistEntry[]>([]);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isBundleBusy, setIsBundleBusy] = useState(false);

  const refreshEntries = () => {
    void listPlaylistEntries().then((list) =>
      setEntries([...list].sort((a, b) => b.savedAt.localeCompare(a.savedAt))),
    );
  };

  useEffect(refreshEntries, []);

  // --- Projeto atual -------------------------------------------------

  const handleNew = () => {
    if (!window.confirm('Iniciar um novo projeto? As alterações não salvas do projeto atual serão perdidas.')) return;
    setProject(createEmptyProject());
    useHistoryStore.getState().clear();
    usePlaybackStore.getState().stop();
    usePlaybackStore.getState().setCurrentTime(0);
  };

  const handleSave = () => {
    void saveProjectToLocal(project);
  };

  const handleExportProject = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenProject = () => projectFileInputRef.current?.click();

  const handleProjectFileChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = migrateProject(JSON.parse(text));
      if (parsed) {
        setProject(parsed);
        useHistoryStore.getState().clear();
      }
    } catch {
      window.alert('Não foi possível ler este arquivo de projeto.');
    }
  };

  // --- Playlist (várias músicas, cada uma com seus efeitos) ----------

  const handleAddToPlaylist = async () => {
    const name = window.prompt('Salvar show atual na playlist como', project.name);
    if (!name || !name.trim()) return;
    setIsSavingEntry(true);
    try {
      const id = createId();
      await savePlaylistEntry({ id, name: name.trim(), project, savedAt: new Date().toISOString() });
      if (project.audio.fileName) {
        const stored = await loadAudioBlob();
        if (stored) await savePlaylistAudio(id, stored.fileName, stored.blob);
      }
      refreshEntries();
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleLoadEntry = async (entry: PlaylistEntry) => {
    setLoadingId(entry.id);
    try {
      usePlaybackStore.getState().stop();
      audioEngine.clear();
      setProject(entry.project);
      useHistoryStore.getState().clear();

      const audio = await loadPlaylistAudio(entry.id);
      if (audio) {
        const arrayBuffer = await audio.blob.arrayBuffer();
        await audioEngine.loadFromArrayBuffer(arrayBuffer, () => usePlaybackStore.getState().stop());
        // Keep the regular autosave slot in sync so a later refresh doesn't
        // lose this show's audio the same way importing a track does.
        await saveAudioBlob(audio.fileName, audio.blob);
      }
      setProjectPanelOpen(false);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteEntry = async (entry: PlaylistEntry) => {
    if (!window.confirm(`Remover "${entry.name}" da playlist? Isso não pode ser desfeito.`)) return;
    await removePlaylistEntry(entry.id);
    refreshEntries();
  };

  const handleExportPlaylist = async () => {
    if (entries.length === 0) {
      window.alert('A playlist está vazia — não há nada para exportar ainda.');
      return;
    }
    setIsBundleBusy(true);
    try {
      const bundle = await exportPlaylistBundle();
      const blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'playlist.stagefx.json';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsBundleBusy(false);
    }
  };

  const handleImportPlaylistClick = () => bundleFileInputRef.current?.click();

  const handleBundleFileChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsBundleBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as PlaylistBundle;
      if (parsed.version !== 1 || !Array.isArray(parsed.entries)) {
        throw new Error('formato inválido');
      }
      const count = await importPlaylistBundle(parsed);
      refreshEntries();
      window.alert(`${count} show${count === 1 ? '' : 's'} importado${count === 1 ? '' : 's'} para a playlist.`);
    } catch {
      window.alert('Não foi possível ler este arquivo de playlist.');
    } finally {
      setIsBundleBusy(false);
    }
  };

  return (
    <div className="project-panel">
      <div className="project-panel__section">
        <div className="project-panel__section-title">Projeto Atual</div>
        <div className="project-panel__row">
          <IconButton icon="file-plus" label="Novo Projeto" onClick={handleNew} />
          <IconButton icon="folder-open" label="Abrir Arquivo (.json)" onClick={handleOpenProject} />
          <IconButton icon="save" label="Salvar (mantém no navegador)" onClick={handleSave} />
          <IconButton icon="download" label="Exportar Arquivo (.json)" onClick={handleExportProject} />
        </div>
        <input
          ref={projectFileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleProjectFileChosen}
        />
      </div>

      <div className="project-panel__divider" />

      <div className="project-panel__section">
        <div className="project-panel__section-title">Playlist</div>
        <div className="project-panel__hint">
          Uma playlist é uma lista com várias músicas, cada uma já com seus efeitos configurados — clique numa
          música salva para carregá-la com tudo pronto.
        </div>
        <div className="project-panel__row">
          <button type="button" className="project-panel__primary-button" onClick={handleAddToPlaylist} disabled={isSavingEntry}>
            {isSavingEntry ? 'Salvando…' : `Adicionar "${project.name}" à Playlist`}
          </button>
        </div>
        <div className="project-panel__row">
          <IconButton
            icon="download"
            label="Exportar Playlist Inteira (um arquivo com todas as músicas salvas)"
            onClick={handleExportPlaylist}
            disabled={isBundleBusy}
          />
          <IconButton
            icon="folder-open"
            label="Importar Playlist (adiciona as músicas de um arquivo de playlist)"
            onClick={handleImportPlaylistClick}
            disabled={isBundleBusy}
          />
        </div>
        <input
          ref={bundleFileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleBundleFileChosen}
        />

        {entries.length === 0 ? (
          <div className="project-panel__empty">
            Nenhum show salvo ainda. Monte um show e clique em "Adicionar à Playlist" — depois é só clicar para
            reabri-lo com os efeitos já no lugar.
          </div>
        ) : (
          <div className="project-panel__list">
            {entries.map((entry) => (
              <div key={entry.id} className="project-panel__entry-row">
                <button
                  type="button"
                  className="project-panel__entry-main"
                  onClick={() => handleLoadEntry(entry)}
                  disabled={loadingId !== null}
                >
                  <span className="project-panel__entry-name">{entry.name}</span>
                  <span className="project-panel__entry-meta">
                    {entry.project.devices.length} efeito{entry.project.devices.length === 1 ? '' : 's'} ·{' '}
                    {entry.project.timeline.events.length} marcaç{entry.project.timeline.events.length === 1 ? 'ão' : 'ões'} ·{' '}
                    {new Date(entry.savedAt).toLocaleDateString()}
                  </span>
                </button>
                {loadingId === entry.id ? (
                  <span className="project-panel__loading">Carregando…</span>
                ) : (
                  <IconButton icon="trash" label="Remover da Playlist" onClick={() => handleDeleteEntry(entry)} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
