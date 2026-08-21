import type { ReactNode } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { StageSettingsForm } from './StageSettingsForm';
import { DevicePropertiesPanel } from './DevicePropertiesPanel';
import { PlatformPropertiesPanel } from './PlatformPropertiesPanel';
import { FigurePropertiesPanel } from './FigurePropertiesPanel';
import { MultiSelectToolsPanel } from './MultiSelectToolsPanel';
import './InspectorPanel.css';

export function InspectorPanel() {
  const devices = useProjectStore((s) => s.project.devices);
  const platforms = useProjectStore((s) => s.project.platforms);
  const figures = useProjectStore((s) => s.project.figures);
  const selectedIds = useSelectionStore((s) => s.selectedDeviceIds);
  const selectedPlatformIds = useSelectionStore((s) => s.selectedPlatformIds);
  const selectedFigureIds = useSelectionStore((s) => s.selectedFigureIds);
  const selected = devices.filter((d) => selectedIds.includes(d.id));
  const selectedPlatform = platforms.find((p) => selectedPlatformIds.includes(p.id));
  const selectedFigure = figures.find((f) => selectedFigureIds.includes(f.id));

  let title = 'CONFIGURAÇÕES DO PALCO';
  let content: ReactNode;

  if (selectedPlatform) {
    title = 'PRATICÁVEL';
    content = <PlatformPropertiesPanel platform={selectedPlatform} />;
  } else if (selectedFigure) {
    title = 'CENÁRIO';
    content = <FigurePropertiesPanel figure={selectedFigure} />;
  } else if (selected.length === 0) {
    content = <StageSettingsForm />;
  } else if (selected.length === 1) {
    title = 'EFEITO';
    content = <DevicePropertiesPanel device={selected[0]} />;
  } else {
    title = 'SELEÇÃO';
    content = <MultiSelectToolsPanel devices={selected} />;
  }

  return (
    <div className="inspector-panel">
      <div className="panel-title">{title}</div>
      <div className="inspector-panel__scroll">{content}</div>
    </div>
  );
}
