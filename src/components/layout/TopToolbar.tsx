import { useRef } from 'react';
import { useProjectStore, createEmptyProject } from '../../stores/projectStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useHistoryStore } from '../../stores/historyStore';
import { useUiStore } from '../../stores/uiStore';
import { undo, redo } from '../../commands';
import type { ChangeEvent } from 'react';
import { IconButton } from '../common/IconButton';
import { Icon } from '../common/Icon';
import { formatTime } from '../../utils/time';
import { saveProjectToLocal } from '../../persistence/autosave';
import { migrateProject } from '../../persistence/schema';
import { Modal } from '../common/Modal';
import { StageSettingsForm } from '../inspector/StageSettingsForm';
import { HotkeysPanel } from '../hotkeys/HotkeysPanel';
import { PlaylistPanel } from '../playlist/PlaylistPanel';
import { clipRecorder } from '../../engine/clipRecorder';
import './TopToolbar.css';

export function TopToolbar() {
  const project = useProjectStore((s) => s.project);
  const setProjectName = useProjectStore((s) => s._setProjectName);
  const setProject = useProjectStore((s) => s._setProject);
  const canUndo = useHistoryStore((s) => s.undoStack.length > 0);
  const canRedo = useHistoryStore((s) => s.redoStack.length > 0);
  const undoLabel = useHistoryStore((s) => s.undoStack[s.undoStack.length - 1]?.label);
  const redoLabel = useHistoryStore((s) => s.redoStack[s.redoStack.length - 1]?.label);

  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const togglePlay = usePlaybackStore((s) => s.togglePlay);
  const stop = usePlaybackStore((s) => s.stop);
  const trimStart = useProjectStore((s) => s.project.audio.trimStart);

  const viewMode = useProjectStore((s) => s.project.settings.viewMode);
  const setSettings = useProjectStore((s) => s._setSettings);

  const isSettingsOpen = useUiStore((s) => s.isStageSettingsOpen);
  const setSettingsOpen = useUiStore((s) => s.setStageSettingsOpen);
  const isHotkeysPanelOpen = useUiStore((s) => s.isHotkeysPanelOpen);
  const setHotkeysPanelOpen = useUiStore((s) => s.setHotkeysPanelOpen);
  const isRecording = usePlaybackStore((s) => s.isRecording);
  const toggleRecording = usePlaybackStore((s) => s.toggleRecording);
  const isClipRecording = useUiStore((s) => s.isClipRecording);
  const setClipRecording = useUiStore((s) => s.setClipRecording);
  const isPlaylistOpen = useUiStore((s) => s.isPlaylistOpen);
  const setPlaylistOpen = useUiStore((s) => s.setPlaylistOpen);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleClipRecording = async () => {
    if (isClipRecording) {
      setClipRecording(false);
      await clipRecorder.stop(project.name);
      return;
    }
    if (viewMode !== '3D') {
      setSettings({ viewMode: '3D' });
      // Give the 3D <canvas> a moment to actually mount before capturing it.
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    const error = clipRecorder.start();
    if (error) {
      window.alert(error);
      return;
    }
    setClipRecording(true);
  };

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

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpen = () => fileInputRef.current?.click();

  const handleFileChosen = async (e: ChangeEvent<HTMLInputElement>) => {
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

  return (
    <header className="top-toolbar">
      <div className="top-toolbar__group">
        <span className="top-toolbar__project-label">PROJETO</span>
        <input
          className="top-toolbar__project-name"
          value={project.name}
          onChange={(e) => setProjectName(e.target.value)}
        />
      </div>

      <div className="top-toolbar__divider" />

      <div className="top-toolbar__group">
        <IconButton icon="file-plus" label="Novo" onClick={handleNew} />
        <IconButton icon="folder-open" label="Abrir" onClick={handleOpen} />
        <IconButton icon="save" label="Salvar" onClick={handleSave} />
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleFileChosen}
        />
      </div>

      <div className="top-toolbar__divider" />

      <div className="top-toolbar__group">
        <IconButton icon="undo" label={undoLabel ? `Desfazer ${undoLabel}` : 'Desfazer'} onClick={undo} disabled={!canUndo} />
        <IconButton icon="redo" label={redoLabel ? `Refazer ${redoLabel}` : 'Refazer'} onClick={redo} disabled={!canRedo} />
      </div>

      <div className="top-toolbar__divider" />

      <div className="top-toolbar__group top-toolbar__segmented">
        <button
          type="button"
          className={viewMode === '2D' ? 'is-active' : ''}
          onClick={() => setSettings({ viewMode: '2D' })}
        >
          <Icon name="view-2d" size={12} /> 2D
        </button>
        <button
          type="button"
          className={viewMode === '3D' ? 'is-active' : ''}
          onClick={() => setSettings({ viewMode: '3D' })}
        >
          <Icon name="view-3d" size={12} /> 3D
        </button>
      </div>

      <div className="top-toolbar__spacer" />

      <div className="top-toolbar__group top-toolbar__transport">
        <span className="top-toolbar__time">{formatTime(Math.max(0, currentTime - trimStart))}</span>
        <IconButton
          icon={isPlaying ? 'stop' : 'play'}
          label={isPlaying ? 'Parar' : 'Reproduzir'}
          active={isPlaying}
          onClick={() => (isPlaying ? stop() : togglePlay())}
        />
        <IconButton
          icon="record"
          label={isRecording ? 'Parar Gravação de Marcações por Atalho' : 'Gravar Marcações por Atalho na Timeline'}
          active={isRecording}
          onClick={toggleRecording}
          className={isRecording ? 'top-toolbar__record-active' : undefined}
        />
        <IconButton
          icon="record-clip"
          label={
            isClipRecording
              ? 'Parar Gravação do Vídeo (salva um arquivo .webm)'
              : 'Gravar Vídeo (grava o show em 3D + áudio em tempo real)'
          }
          active={isClipRecording}
          onClick={handleToggleClipRecording}
          className={isClipRecording ? 'top-toolbar__record-active' : undefined}
        />
      </div>

      <div className="top-toolbar__divider" />

      <div className="top-toolbar__group">
        <IconButton icon="playlist" label="Playlist" onClick={() => setPlaylistOpen(true)} />
        <IconButton icon="keyboard" label="Atalhos" onClick={() => setHotkeysPanelOpen(true)} />
        <IconButton icon="download" label="Exportar" onClick={handleExport} />
        <IconButton icon="settings" label="Configurações" onClick={() => setSettingsOpen(true)} />
      </div>

      {isSettingsOpen && (
        <Modal title="Configurações do Palco" onClose={() => setSettingsOpen(false)}>
          <StageSettingsForm />
        </Modal>
      )}
      {isHotkeysPanelOpen && (
        <Modal title="Atalhos de Teclado" onClose={() => setHotkeysPanelOpen(false)}>
          <HotkeysPanel />
        </Modal>
      )}
      {isPlaylistOpen && (
        <Modal title="Playlist" onClose={() => setPlaylistOpen(false)}>
          <PlaylistPanel />
        </Modal>
      )}
    </header>
  );
}
