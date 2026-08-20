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
      <div className="inspector-subtle">Platform / Praticável</div>

      <div className="inspector-section__row inspector-section__row--gap">
        <IconButton
          icon={platform.locked ? 'lock' : 'unlock'}
          label={platform.locked ? 'Locked' : 'Unlocked'}
          active={platform.locked}
          onClick={() => commit({ locked: platform.locked }, { locked: !platform.locked }, 'Toggle Lock')}
        />
        <label className="inspector-checkbox">
          Color
          <input
            type="color"
            value={platform.color}
            onChange={(e) => commit({ color: platform.color }, { color: e.target.value }, 'Edit Color')}
          />
        </label>
        <IconButton icon="trash" label="Delete" onClick={() => removePlatforms([platform.id])} />
      </div>

      <div className="inspector-group-title">Dimensions (meters)</div>
      <NumberField
        label="Width"
        value={platform.dimensions.width}
        min={0.1}
        step={0.1}
        suffix="m"
        onCommit={(width) =>
          commit(
            { dimensions: platform.dimensions },
            { dimensions: { ...platform.dimensions, width } },
            'Resize Platform',
          )
        }
        onChange={() => {}}
      />
      <NumberField
        label="Height"
        value={platform.dimensions.height}
        min={0.05}
        step={0.05}
        suffix="m"
        onCommit={(height) =>
          commit(
            { dimensions: platform.dimensions },
            { dimensions: { ...platform.dimensions, height } },
            'Resize Platform',
          )
        }
        onChange={() => {}}
      />
      <NumberField
        label="Depth"
        value={platform.dimensions.depth}
        min={0.1}
        step={0.1}
        suffix="m"
        onCommit={(depth) =>
          commit(
            { dimensions: platform.dimensions },
            { dimensions: { ...platform.dimensions, depth } },
            'Resize Platform',
          )
        }
        onChange={() => {}}
      />

      <div className="inspector-group-title">Position (meters)</div>
      <NumberField
        label="X"
        value={platform.position.x}
        onCommit={(x) => commit({ position: platform.position }, { position: { ...platform.position, x } }, 'Move Platform')}
        onChange={() => {}}
      />
      <NumberField
        label="Y"
        value={platform.position.y}
        onCommit={(y) => commit({ position: platform.position }, { position: { ...platform.position, y } }, 'Move Platform')}
        onChange={() => {}}
      />
      <NumberField
        label="Z (base height)"
        value={platform.position.z}
        onCommit={(z) => commit({ position: platform.position }, { position: { ...platform.position, z } }, 'Move Platform')}
        onChange={() => {}}
      />
      <NumberField
        label="Rotation"
        value={platform.rotation.z}
        suffix="°"
        step={5}
        onCommit={(z) => commit({ rotation: platform.rotation }, { rotation: { ...platform.rotation, z } }, 'Rotate Platform')}
        onChange={() => {}}
      />
    </div>
  );
}
