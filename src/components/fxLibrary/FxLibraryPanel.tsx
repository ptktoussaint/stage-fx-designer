import { useState } from 'react';
import { CATEGORY_LABELS, CATEGORY_ORDER, getDefinitionsByCategory } from '../../devices/registry';
import { useProjectStore } from '../../stores/projectStore';
import { addDevice } from '../../commands';
import { useSelectionStore } from '../../stores/selectionStore';
import { Icon } from '../common/Icon';
import type { DeviceDefinition } from '../../types';
import './FxLibraryPanel.css';

export const DEVICE_DEFINITION_DRAG_TYPE = 'application/x-stage-fx-device-definition';

function FxLibraryItem({ definition }: { definition: DeviceDefinition }) {
  const handleClick = () => {
    const stage = useProjectStore.getState().project.stage;
    const id = addDevice(definition, { x: stage.width / 2, y: stage.depth / 2, z: 0 });
    useSelectionStore.getState().select(id);
  };

  return (
    <div
      className="fx-item"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DEVICE_DEFINITION_DRAG_TYPE, definition.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={handleClick}
      title={`Add ${definition.name}`}
    >
      <span className={`fx-item__icon fx-item__icon--${definition.category.toLowerCase()}`}>
        <Icon name={definition.icon as never} />
      </span>
      <span className="fx-item__name">{definition.name}</span>
    </div>
  );
}

function FxCategory({ category }: { category: (typeof CATEGORY_ORDER)[number] }) {
  const [open, setOpen] = useState(true);
  const definitions = getDefinitionsByCategory(category);

  return (
    <div className="fx-category">
      <button type="button" className="fx-category__header" onClick={() => setOpen((v) => !v)}>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={11} />
        <span>{CATEGORY_LABELS[category]}</span>
      </button>
      {open && (
        <div className="fx-category__items">
          {definitions.map((def) => (
            <FxLibraryItem key={def.id} definition={def} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FxLibraryPanel() {
  return (
    <div className="fx-library">
      <div className="panel-title">FX LIBRARY</div>
      <div className="fx-library__list">
        {CATEGORY_ORDER.map((category) => (
          <FxCategory key={category} category={category} />
        ))}
      </div>
    </div>
  );
}
