import { useUiStore } from '../../stores/uiStore';
import { useProjectStore } from '../../stores/projectStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { duplicateDevices, removeDevices, setDevicesLocked, updateDeviceProperty } from '../../commands';
import { ContextMenu, type ContextMenuItem } from '../common/ContextMenu';

export function AppContextMenu() {
  const contextMenu = useUiStore((s) => s.contextMenu);
  const closeContextMenu = useUiStore((s) => s.closeContextMenu);
  const setStageSettingsOpen = useUiStore((s) => s.setStageSettingsOpen);
  const devices = useProjectStore((s) => s.project.devices);
  const groups = useProjectStore((s) => s.project.groups);
  const setSelection = useSelectionStore((s) => s.setSelection);

  if (!contextMenu?.target) return null;

  let items: ContextMenuItem[];

  if (contextMenu.target.type === 'device') {
    const deviceId = contextMenu.target.deviceId;
    const found = devices.find((d) => d.id === deviceId);

    items = found
      ? [
          { label: 'Duplicate', icon: 'duplicate', onSelect: () => duplicateDevices([deviceId]) },
          {
            label: 'Rename',
            onSelect: () => {
              const next = window.prompt('Rename device', found.name);
              if (next && next.trim()) {
                updateDeviceProperty(deviceId, { name: found.name }, { name: next.trim() }, 'Rename Device');
              }
            },
          },
          {
            label: found.locked ? 'Unlock' : 'Lock',
            icon: found.locked ? 'unlock' : 'lock',
            onSelect: () => setDevicesLocked([deviceId], !found.locked),
          },
          ...groups
            .filter((g) => !found.groupIds.includes(g.id))
            .map((g) => ({
              label: `Add to ${g.name}`,
              icon: 'group' as const,
              onSelect: () =>
                updateDeviceProperty(
                  deviceId,
                  { groupIds: found.groupIds },
                  { groupIds: [...found.groupIds, g.id] },
                  'Add to Group',
                ),
            })),
          ...groups
            .filter((g) => found.groupIds.includes(g.id))
            .map((g) => ({
              label: `Remove from ${g.name}`,
              onSelect: () =>
                updateDeviceProperty(
                  deviceId,
                  { groupIds: found.groupIds },
                  { groupIds: found.groupIds.filter((id) => id !== g.id) },
                  'Remove from Group',
                ),
            })),
          { label: 'Delete', icon: 'trash', danger: true, onSelect: () => removeDevices([deviceId]) },
        ]
      : [];
  } else {
    items = [
      { label: 'Paste', disabled: true, onSelect: () => {} },
      { label: 'Select All', onSelect: () => setSelection(devices.map((d) => d.id)) },
      { label: 'Stage Settings', icon: 'settings', onSelect: () => setStageSettingsOpen(true) },
    ];
  }

  return <ContextMenu x={contextMenu.x} y={contextMenu.y} items={items} onClose={closeContextMenu} />;
}
