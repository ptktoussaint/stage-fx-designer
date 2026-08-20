import { useProjectStore } from '../../stores/projectStore';
import { getFigureDefinition } from '../../figures/registry';
import { updateFigureProperty, removeFigures } from '../../commands';
import { NumberField } from '../common/NumberField';
import { IconButton } from '../common/IconButton';
import type { FigureInstance } from '../../types';

export function FigurePropertiesPanel({ figure }: { figure: FigureInstance }) {
  const definition = getFigureDefinition(figure.definitionId);
  if (!definition) return <div className="inspector-empty">Unknown figure type.</div>;

  const commit = (patchBefore: Partial<FigureInstance>, patchAfter: Partial<FigureInstance>, label?: string) =>
    updateFigureProperty(figure.id, patchBefore, patchAfter, label);

  return (
    <div className="inspector-section">
      <div className="inspector-section__row">
        <input
          className="inspector-name-input"
          value={figure.name}
          onChange={(e) => useProjectStore.getState()._updateFigure(figure.id, { name: e.target.value })}
        />
      </div>
      <div className="inspector-subtle">{definition.name} · {definition.heightMeters}m</div>

      <div className="inspector-section__row inspector-section__row--gap">
        <IconButton
          icon={figure.locked ? 'lock' : 'unlock'}
          label={figure.locked ? 'Locked' : 'Unlocked'}
          active={figure.locked}
          onClick={() => commit({ locked: figure.locked }, { locked: !figure.locked }, 'Toggle Lock')}
        />
        <IconButton icon="trash" label="Delete" onClick={() => removeFigures([figure.id])} />
      </div>

      <div className="inspector-group-title">Position (meters)</div>
      <NumberField
        label="X"
        value={figure.position.x}
        onCommit={(x) => commit({ position: figure.position }, { position: { ...figure.position, x } }, 'Move Figure')}
        onChange={() => {}}
      />
      <NumberField
        label="Y"
        value={figure.position.y}
        onCommit={(y) => commit({ position: figure.position }, { position: { ...figure.position, y } }, 'Move Figure')}
        onChange={() => {}}
      />
      <NumberField
        label="Z (height)"
        value={figure.position.z}
        onCommit={(z) => commit({ position: figure.position }, { position: { ...figure.position, z } }, 'Move Figure')}
        onChange={() => {}}
      />
      <NumberField
        label="Rotation"
        value={figure.rotation.z}
        suffix="°"
        step={5}
        onCommit={(z) => commit({ rotation: figure.rotation }, { rotation: { ...figure.rotation, z } }, 'Rotate Figure')}
        onChange={() => {}}
      />
    </div>
  );
}
