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

  const viewMode = useProjectStore((s) => s.project.settings.viewMode);
  const setSettings = useProjectStore((s) => s._setSettings);

  const isSettingsOpen = useUiStore((s) => s.isStageSettingsOpen);
  const setSettingsOpen = useUiStore((s) => s.setStageSettingsOpen);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNew = () => {
    if (!window.confirm('Start a new project? Unsaved changes in the current one will be lost.')) return;
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
      window.alert('Could not read this project file.');
    }
  };

  return (
    <header className="top-toolbar">
      <div className="top-toolbar__group">
        <span className="top-toolbar__project-label">PROJECT</span>
        <input
          className="top-toolbar__project-name"
          value={project.name}
          onChange={(e) => setProjectName(e.target.value)}
        />
      </div>

      <div className="top-toolbar__divider" />

      <div className="top-toolbar__group">
        <IconButton icon="file-plus" label="New" onClick={handleNew} />
        <IconButton icon="folder-open" label="Open" onClick={handleOpen} />
        <IconButton icon="save" label="Save" onClick={handleSave} />
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
        <IconButton icon="undo" label={undoLabel ? `Undo ${undoLabel}` : 'Undo'} onClick={undo} disabled={!canUndo} />
        <IconButton icon="redo" label={redoLabel ? `Redo ${redoLabel}` : 'Redo'} onClick={redo} disabled={!canRedo} />
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
        <span className="top-toolbar__time">{formatTime(currentTime)}</span>
        <IconButton
          icon={isPlaying ? 'stop' : 'play'}
          label={isPlaying ? 'Stop' : 'Play'}
          active={isPlaying}
          onClick={() => (isPlaying ? stop() : togglePlay())}
        />
      </div>

      <div className="top-toolbar__divider" />

      <div className="top-toolbar__group">
        <IconButton icon="download" label="Export" onClick={handleExport} />
        <IconButton icon="settings" label="Settings" onClick={() => setSettingsOpen(true)} />
      </div>

      {isSettingsOpen && (
        <Modal title="Stage Settings" onClose={() => setSettingsOpen(false)}>
          <StageSettingsForm />
        </Modal>
      )}
    </header>
  );
}
