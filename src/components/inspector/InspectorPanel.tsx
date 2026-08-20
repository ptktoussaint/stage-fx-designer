import type { ReactNode } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { StageSettingsForm } from './StageSettingsForm';
import { DevicePropertiesPanel } from './DevicePropertiesPanel';
import { MultiSelectToolsPanel } from './MultiSelectToolsPanel';
import './InspectorPanel.css';

export function InspectorPanel() {
  const devices = useProjectStore((s) => s.project.devices);
  const selectedIds = useSelectionStore((s) => s.selectedDeviceIds);
  const selected = devices.filter((d) => selectedIds.includes(d.id));

  let title = 'STAGE SETTINGS';
  let content: ReactNode;

  if (selected.length === 0) {
    content = <StageSettingsForm />;
  } else if (selected.length === 1) {
    title = 'DEVICE';
    content = <DevicePropertiesPanel device={selected[0]} />;
  } else {
    title = 'SELECTION';
    content = <MultiSelectToolsPanel devices={selected} />;
  }

  return (
    <div className="inspector-panel">
      <div className="panel-title">{title}</div>
      <div className="inspector-panel__scroll">{content}</div>
    </div>
  );
}
