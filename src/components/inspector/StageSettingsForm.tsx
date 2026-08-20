import { useProjectStore } from '../../stores/projectStore';
import { NumberField } from '../common/NumberField';

export function StageSettingsForm() {
  const stage = useProjectStore((s) => s.project.stage);
  const setStage = useProjectStore((s) => s._setStage);
  const snap = useProjectStore((s) => s.project.settings.snap);
  const setSettings = useProjectStore((s) => s._setSettings);

  return (
    <div>
      <NumberField label="Width" value={stage.width} step={0.5} min={1} suffix="m" onChange={(width) => setStage({ width })} />
      <NumberField label="Depth" value={stage.depth} step={0.5} min={1} suffix="m" onChange={(depth) => setStage({ depth })} />
      <NumberField
        label="Grid Size"
        value={stage.gridSize}
        step={0.05}
        min={0.05}
        suffix="m"
        onChange={(gridSize) => setStage({ gridSize })}
      />
      <NumberField
        label="Origin X"
        value={stage.origin.x}
        step={0.5}
        suffix="m"
        onChange={(x) => setStage({ origin: { ...stage.origin, x } })}
      />
      <NumberField
        label="Origin Y"
        value={stage.origin.y}
        step={0.5}
        suffix="m"
        onChange={(y) => setStage({ origin: { ...stage.origin, y } })}
      />

      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '8px 0' }} />

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
        <input
          type="checkbox"
          checked={snap.enabled}
          onChange={(e) => setSettings({ snap: { ...snap, enabled: e.target.checked } })}
        />
        Snap enabled
      </label>
      {(['toGrid', 'toDevice', 'toCenter', 'toStageEdge'] as const).map((key) => (
        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0 3px 16px', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            disabled={!snap.enabled}
            checked={snap[key]}
            onChange={(e) => setSettings({ snap: { ...snap, [key]: e.target.checked } })}
          />
          {key === 'toGrid' && 'Snap to Grid'}
          {key === 'toDevice' && 'Snap to Device'}
          {key === 'toCenter' && 'Snap to Center'}
          {key === 'toStageEdge' && 'Snap to Stage Edge'}
        </label>
      ))}
    </div>
  );
}
