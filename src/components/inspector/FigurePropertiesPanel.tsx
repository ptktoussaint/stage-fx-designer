import { useProjectStore } from '../../stores/projectStore';
import { getFigureDefinition } from '../../figures/registry';
import { updateFigureProperty, removeFigures } from '../../commands';
import { NumberField } from '../common/NumberField';
import { IconButton } from '../common/IconButton';
import type { FigureInstance } from '../../types';

export function FigurePropertiesPanel({ figure }: { figure: FigureInstance }) {
  const definition = getFigureDefinition(figure.definitionId);
  if (!definition) return <div className="inspector-empty">Tipo de cenário desconhecido.</div>;

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
          label={figure.locked ? 'Travado' : 'Destravado'}
          active={figure.locked}
          onClick={() => commit({ locked: figure.locked }, { locked: !figure.locked }, 'Travar/Destravar')}
        />
        <label className="inspector-checkbox">
          Cor
          <input
            type="color"
            value={figure.color}
            onChange={(e) => commit({ color: figure.color }, { color: e.target.value }, 'Editar Cor')}
          />
        </label>
        <IconButton icon="trash" label="Excluir" onClick={() => removeFigures([figure.id])} />
      </div>

      <div className="inspector-group-title">Posição (metros)</div>
      <NumberField
        label="Horizontal"
        value={figure.position.x}
        onCommit={(x) => commit({ position: figure.position }, { position: { ...figure.position, x } }, 'Mover')}
        onChange={() => {}}
      />
      <NumberField
        label="Distância"
        value={figure.position.y}
        onCommit={(y) => commit({ position: figure.position }, { position: { ...figure.position, y } }, 'Mover')}
        onChange={() => {}}
      />
      <NumberField
        label="Altura"
        value={figure.position.z}
        onCommit={(z) => commit({ position: figure.position }, { position: { ...figure.position, z } }, 'Mover')}
        onChange={() => {}}
      />
      <NumberField
        label="Rotação"
        value={figure.rotation.z}
        suffix="°"
        step={5}
        onCommit={(z) => commit({ rotation: figure.rotation }, { rotation: { ...figure.rotation, z } }, 'Rotacionar')}
        onChange={() => {}}
      />
    </div>
  );
}
