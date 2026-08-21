import { useProjectStore } from '../../stores/projectStore';
import { NumberField } from '../common/NumberField';

export function StageSettingsForm() {
  const stage = useProjectStore((s) => s.project.stage);
  const setStage = useProjectStore((s) => s._setStage);
  const snap = useProjectStore((s) => s.project.settings.snap);
  const setSettings = useProjectStore((s) => s._setSettings);

  return (
    <div>
      <NumberField label="Largura" value={stage.width} step={0.5} min={1} suffix="m" onChange={(width) => setStage({ width })} />
      <NumberField label="Profundidade" value={stage.depth} step={0.5} min={1} suffix="m" onChange={(depth) => setStage({ depth })} />
      <NumberField
        label="Altura do Palco"
        value={stage.height}
        step={0.1}
        min={0}
        suffix="m"
        onChange={(height) => setStage({ height })}
      />
      <NumberField
        label="Espaço Frontal"
        value={stage.frontMargin}
        step={0.5}
        min={0}
        suffix="m"
        onChange={(frontMargin) => setStage({ frontMargin })}
      />
      <NumberField
        label="Tamanho da Grade"
        value={stage.gridSize}
        step={0.05}
        min={0.05}
        suffix="m"
        onChange={(gridSize) => setStage({ gridSize })}
      />
      <NumberField
        label="Origem Horizontal"
        value={stage.origin.x}
        step={0.5}
        suffix="m"
        onChange={(x) => setStage({ origin: { ...stage.origin, x } })}
      />
      <NumberField
        label="Origem Distância"
        value={stage.origin.y}
        step={0.5}
        suffix="m"
        onChange={(y) => setStage({ origin: { ...stage.origin, y } })}
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
        Cor do Palco
        <input type="color" value={stage.color} onChange={(e) => setStage({ color: e.target.value })} />
      </label>

      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '8px 0' }} />

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
        <input
          type="checkbox"
          checked={snap.enabled}
          onChange={(e) => setSettings({ snap: { ...snap, enabled: e.target.checked } })}
        />
        Encaixe ativado
      </label>
      {(['toGrid', 'toDevice', 'toCenter', 'toStageEdge'] as const).map((key) => (
        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0 3px 16px', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            disabled={!snap.enabled}
            checked={snap[key]}
            onChange={(e) => setSettings({ snap: { ...snap, [key]: e.target.checked } })}
          />
          {key === 'toGrid' && 'Encaixar na Grade'}
          {key === 'toDevice' && 'Encaixar em Efeitos'}
          {key === 'toCenter' && 'Encaixar no Centro'}
          {key === 'toStageEdge' && 'Encaixar na Borda do Palco'}
        </label>
      ))}
    </div>
  );
}
