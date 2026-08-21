import { useProjectStore } from '../../stores/projectStore';
import { useUiStore } from '../../stores/uiStore';
import { IconButton } from '../common/IconButton';
import { StageRenderer2D } from './StageRenderer2D';
import { StageRenderer3D } from './StageRenderer3D';
import './StageEditor.css';

export function StageEditor() {
  const viewMode = useProjectStore((s) => s.project.settings.viewMode);
  const activeTool = useUiStore((s) => s.activeTool);
  const setActiveTool = useUiStore((s) => s.setActiveTool);
  const snapEnabled = useProjectStore((s) => s.project.settings.snap.enabled);
  const setSettings = useProjectStore((s) => s._setSettings);
  const snap = useProjectStore((s) => s.project.settings.snap);
  // The fast offline render (engine/offlineShowRenderer.ts) drives this same
  // visible canvas at high speed to produce the video — without this cover,
  // every effect in the show visibly flashes by as it fast-forwards through
  // frames. A small corner toast (RenderProgressToast) shows progress
  // instead, like a browser download notification.
  const isAutoRendering = useUiStore((s) => s.isAutoRendering);

  return (
    <div className="stage-editor">
      <div className="stage-editor__toolbar">
        <IconButton
          icon="cursor"
          label="Ferramenta de Seleção"
          active={activeTool === 'select'}
          onClick={() => setActiveTool('select')}
        />
        <IconButton
          icon="ruler"
          label="Ferramenta de Distância (selecione dois efeitos)"
          active={activeTool === 'distance'}
          onClick={() => setActiveTool('distance')}
        />
        <IconButton
          icon="hand"
          label="Ferramenta de Mover Vista (arraste para mover a vista — também disponível arrastando com o botão do meio do mouse)"
          active={activeTool === 'pan'}
          onClick={() => setActiveTool('pan')}
        />
        <div className="stage-editor__toolbar-divider" />
        <IconButton
          icon="grid"
          label={snapEnabled ? 'Desativar Encaixe' : 'Ativar Encaixe'}
          active={snapEnabled}
          onClick={() => setSettings({ snap: { ...snap, enabled: !snapEnabled } })}
        />
      </div>
      <div className="stage-editor__surface">
        {viewMode === '2D' ? <StageRenderer2D /> : <StageRenderer3D />}
        {isAutoRendering && (
          <div className="stage-editor__render-overlay">
            <span className="stage-editor__render-overlay-spinner" />
            <span>Renderizando vídeo…</span>
          </div>
        )}
      </div>
    </div>
  );
}
