import { useEffect, useRef } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useHistoryStore } from '../../stores/historyStore';
import { useUiStore } from '../../stores/uiStore';
import { undo, redo } from '../../commands';
import { IconButton } from '../common/IconButton';
import { Icon } from '../common/Icon';
import { formatTime } from '../../utils/time';
import { Modal } from '../common/Modal';
import { StageSettingsForm } from '../inspector/StageSettingsForm';
import { HotkeysPanel } from '../hotkeys/HotkeysPanel';
import { ProjectPanel } from '../project/ProjectPanel';
import { clipRecorder } from '../../engine/clipRecorder';
import './TopToolbar.css';

export function TopToolbar() {
  const project = useProjectStore((s) => s.project);
  const setProjectName = useProjectStore((s) => s._setProjectName);
  const canUndo = useHistoryStore((s) => s.undoStack.length > 0);
  const canRedo = useHistoryStore((s) => s.redoStack.length > 0);
  const undoLabel = useHistoryStore((s) => s.undoStack[s.undoStack.length - 1]?.label);
  const redoLabel = useHistoryStore((s) => s.redoStack[s.redoStack.length - 1]?.label);

  const isPlaying = usePlaybackStore((s) => s.isPlaying);
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
  const isProjectPanelOpen = useUiStore((s) => s.isProjectPanelOpen);
  const setProjectPanelOpen = useUiStore((s) => s.setProjectPanelOpen);
  // Live time readout, written straight to the DOM on every playbackStore
  // tick instead of through React state — a plain currentTime subscription
  // here re-rendered this whole toolbar (many icon buttons, undo/redo
  // labels, all of it) 60x/sec during playback. See TimelineWaveform for
  // the fuller rationale; same technique.
  const timeRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const update = (currentTime: number) => {
      if (timeRef.current) timeRef.current.textContent = formatTime(Math.max(0, currentTime - trimStart));
    };
    update(usePlaybackStore.getState().currentTime);
    return usePlaybackStore.subscribe((state) => update(state.currentTime));
  }, [trimStart]);

  const handleToggleClipRecording = async () => {
    if (isClipRecording) {
      setClipRecording(false);
      await clipRecorder.stop(project.name);
      return;
    }
    if (viewMode !== '3D') setSettings({ viewMode: '3D' });
    // Recording needs a WebGL context created with preserveDrawingBuffer
    // (captureStream reads the canvas on its own timer, so the buffer has
    // to survive between frames) — that's off by default for performance,
    // so flipping isClipRecording on remounts the <canvas> with it enabled.
    // Give it a moment to actually mount before capturing it (same wait
    // covers the view-mode switch above too).
    setClipRecording(true);
    await new Promise((resolve) => setTimeout(resolve, 150));
    const error = clipRecorder.start();
    if (error) {
      window.alert(error);
      setClipRecording(false);
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
        <IconButton icon="save" label="Projeto e Playlist (novo, abrir, salvar, exportar)" onClick={() => setProjectPanelOpen(true)} />
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
        <span ref={timeRef} className="top-toolbar__time">
          {formatTime(Math.max(0, usePlaybackStore.getState().currentTime - trimStart))}
        </span>
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
        <IconButton icon="keyboard" label="Atalhos" onClick={() => setHotkeysPanelOpen(true)} />
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
      {isProjectPanelOpen && (
        <Modal title="Projeto e Playlist" onClose={() => setProjectPanelOpen(false)}>
          <ProjectPanel />
        </Modal>
      )}
    </header>
  );
}
