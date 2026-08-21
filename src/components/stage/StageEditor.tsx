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

  return (
    <div className="stage-editor">
      <div className="stage-editor__toolbar">
        <IconButton
          icon="cursor"
          label="Select Tool"
          active={activeTool === 'select'}
          onClick={() => setActiveTool('select')}
        />
        <IconButton
          icon="ruler"
          label="Distance Tool (select two devices)"
          active={activeTool === 'distance'}
          onClick={() => setActiveTool('distance')}
        />
        <IconButton
          icon="hand"
          label="Pan Tool (drag to move the view — also always available via middle-mouse drag)"
          active={activeTool === 'pan'}
          onClick={() => setActiveTool('pan')}
        />
        <div className="stage-editor__toolbar-divider" />
        <IconButton
          icon="grid"
          label={snapEnabled ? 'Disable Snap' : 'Enable Snap'}
          active={snapEnabled}
          onClick={() => setSettings({ snap: { ...snap, enabled: !snapEnabled } })}
        />
      </div>
      <div className="stage-editor__surface">
        {viewMode === '2D' ? <StageRenderer2D /> : <StageRenderer3D />}
      </div>
    </div>
  );
}
