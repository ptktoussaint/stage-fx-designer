import { useState } from 'react';
import {
  FIGURE_CATEGORY_LABELS,
  FIGURE_CATEGORY_ORDER,
  getFigureDefinitionsByCategory,
} from '../../figures/registry';
import { useProjectStore } from '../../stores/projectStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { addFigure, addPlatform } from '../../commands';
import { Icon } from '../common/Icon';
import { DEFAULT_PLATFORM_COLOR, PLATFORM_PRESETS } from '../../types';
import type { FigureDefinition } from '../../types';
import '../fxLibrary/FxLibraryPanel.css';

function PlatformPresetItem({ preset }: { preset: (typeof PLATFORM_PRESETS)[number] }) {
  const handleClick = () => {
    const stage = useProjectStore.getState().project.stage;
    const id = addPlatform(
      preset.name,
      preset.dimensions,
      { x: stage.width / 2, y: stage.depth / 2, z: 0 },
      DEFAULT_PLATFORM_COLOR,
    );
    useSelectionStore.getState().selectPlatform(id);
  };

  return (
    <div className="fx-item" onClick={handleClick} title={`Adicionar ${preset.name}`}>
      <span className="fx-item__icon" style={{ color: 'var(--text-secondary)' }}>
        <Icon name="platform" />
      </span>
      <span className="fx-item__name">
        {preset.name}
        <span className="fx-item__dims">
          {preset.dimensions.width}×{preset.dimensions.height}×{preset.dimensions.depth}m
        </span>
      </span>
    </div>
  );
}

function FigureItem({ definition }: { definition: FigureDefinition }) {
  const handleClick = () => {
    const stage = useProjectStore.getState().project.stage;
    const id = addFigure(definition, { x: stage.width / 2, y: stage.depth / 2, z: 0 });
    useSelectionStore.getState().selectFigure(id);
  };

  return (
    <div className="fx-item" onClick={handleClick} title={`Adicionar ${definition.name}`}>
      <span className="fx-item__icon" style={{ color: 'var(--accent)' }}>
        <Icon name={definition.icon as never} />
      </span>
      <span className="fx-item__name">{definition.name}</span>
    </div>
  );
}

function SceneryCategory({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="fx-category">
      <button type="button" className="fx-category__header" onClick={() => setOpen((v) => !v)}>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={11} />
        <span>{title}</span>
      </button>
      {open && <div className="fx-category__items">{children}</div>}
    </div>
  );
}

/**
 * Non-FX scenery: praticáveis (platforms/risers, custom-dimensioned per
 * instance — see PLATFORM_PRESETS) and bonecos (dancer/band/instrument
 * figures, catalog-driven like the FX Library). Neither emits a
 * SIMULATION_TRIGGER; both exist purely to place real-scale reference
 * objects so effects can be positioned relative to them.
 */
export function SceneryLibraryPanel() {
  return (
    <div className="fx-library">
      <div className="panel-title">CENÁRIO</div>
      <div className="fx-library__list">
        <SceneryCategory title="Praticáveis">
          {PLATFORM_PRESETS.map((preset) => (
            <PlatformPresetItem key={preset.name} preset={preset} />
          ))}
        </SceneryCategory>
        {FIGURE_CATEGORY_ORDER.map((category) => (
          <SceneryCategory key={category} title={FIGURE_CATEGORY_LABELS[category]}>
            {getFigureDefinitionsByCategory(category).map((def) => (
              <FigureItem key={def.id} definition={def} />
            ))}
          </SceneryCategory>
        ))}
      </div>
    </div>
  );
}
