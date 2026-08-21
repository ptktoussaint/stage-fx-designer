import { useProjectStore } from '../../stores/projectStore';
import { updatePlatformProperty, removePlatforms } from '../../commands';
import { NumberField } from '../common/NumberField';
import { IconButton } from '../common/IconButton';
import type { PlatformInstance } from '../../types';

export function PlatformPropertiesPanel({ platform }: { platform: PlatformInstance }) {
  const commit = (
    patchBefore: Partial<PlatformInstance>,
    patchAfter: Partial<PlatformInstance>,
    label?: string,
  ) => updatePlatformProperty(platform.id, patchBefore, patchAfter, label);

  return (
    <div className="inspector-section">
      <div className="inspector-section__row">
        <input
          className="inspector-name-input"
          value={platform.name}
          onChange={(e) => useProjectStore.getState()._updatePlatform(platform.id, { name: e.target.value })}
        />
      </div>
      <div className="inspector-subtle">Praticável (Palco)</div>

      <div className="inspector-section__row inspector-section__row--gap">
        <IconButton
          icon={platform.locked ? 'lock' : 'unlock'}
          label={platform.locked ? 'Travado' : 'Destravado'}
          active={platform.locked}
          onClick={() => commit({ locked: platform.locked }, { locked: !platform.locked }, 'Travar/Destravar')}
        />
        <label className="inspector-checkbox">
          Cor
          <input
            type="color"
            value={platform.color}
            onChange={(e) => commit({ color: platform.color }, { color: e.target.value }, 'Editar Cor')}
          />
        </label>
        <IconButton icon="trash" label="Excluir" onClick={() => removePlatforms([platform.id])} />
      </div>

      <div className="inspector-group-title">Dimensões (metros)</div>
      <NumberField
        label="Largura"
        value={platform.dimensions.width}
        min={0.1}
        step={0.1}
        suffix="m"
        onCommit={(width) =>
          commit(
            { dimensions: platform.dimensions },
            { dimensions: { ...platform.dimensions, width } },
            'Redimensionar Praticável',
          )
        }
        onChange={() => {}}
      />
      <NumberField
        label="Altura"
        value={platform.dimensions.height}
        min={0.05}
        step={0.05}
        suffix="m"
        onCommit={(height) =>
          commit(
            { dimensions: platform.dimensions },
            { dimensions: { ...platform.dimensions, height } },
            'Redimensionar Praticável',
          )
        }
        onChange={() => {}}
      />
      <NumberField
        label="Profundidade"
        value={platform.dimensions.depth}
        min={0.1}
        step={0.1}
        suffix="m"
        onCommit={(depth) =>
          commit(
            { dimensions: platform.dimensions },
            { dimensions: { ...platform.dimensions, depth } },
            'Redimensionar Praticável',
          )
        }
        onChange={() => {}}
      />

      <div className="inspector-group-title">Posição (metros)</div>
      <NumberField
        label="Horizontal"
        value={platform.position.x}
        onCommit={(x) => commit({ position: platform.position }, { position: { ...platform.position, x } }, 'Mover Praticável')}
        onChange={() => {}}
      />
      <NumberField
        label="Distância"
        value={platform.position.y}
        onCommit={(y) => commit({ position: platform.position }, { position: { ...platform.position, y } }, 'Mover Praticável')}
        onChange={() => {}}
      />
      <NumberField
        label="Altura da Base"
        value={platform.position.z}
        onCommit={(z) => commit({ position: platform.position }, { position: { ...platform.position, z } }, 'Mover Praticável')}
        onChange={() => {}}
      />
      <NumberField
        label="Rotação"
        value={platform.rotation.z}
        suffix="°"
        step={5}
        onCommit={(z) => commit({ rotation: platform.rotation }, { rotation: { ...platform.rotation, z } }, 'Rotacionar Praticável')}
        onChange={() => {}}
      />
    </div>
  );
}
