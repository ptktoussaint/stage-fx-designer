import { useUiStore } from '../../stores/uiStore';
import { useProjectStore } from '../../stores/projectStore';
import { useSelectionStore } from '../../stores/selectionStore';
import {
  duplicateDevices,
  removeDevices,
  setDevicesLocked,
  updateDeviceProperty,
  removePlatforms,
  updatePlatformProperty,
  removeFigures,
  updateFigureProperty,
} from '../../commands';
import { ContextMenu, type ContextMenuItem } from '../common/ContextMenu';

export function AppContextMenu() {
  const contextMenu = useUiStore((s) => s.contextMenu);
  const closeContextMenu = useUiStore((s) => s.closeContextMenu);
  const setStageSettingsOpen = useUiStore((s) => s.setStageSettingsOpen);
  const devices = useProjectStore((s) => s.project.devices);
  const platforms = useProjectStore((s) => s.project.platforms);
  const figures = useProjectStore((s) => s.project.figures);
  const groups = useProjectStore((s) => s.project.groups);
  const setSelection = useSelectionStore((s) => s.setSelection);

  if (!contextMenu?.target) return null;

  let items: ContextMenuItem[];

  if (contextMenu.target.type === 'platform') {
    const platformId = contextMenu.target.platformId;
    const found = platforms.find((p) => p.id === platformId);
    items = found
      ? [
          {
            label: 'Renomear',
            onSelect: () => {
              const next = window.prompt('Renomear praticável', found.name);
              if (next && next.trim()) {
                updatePlatformProperty(platformId, { name: found.name }, { name: next.trim() }, 'Renomear Praticável');
              }
            },
          },
          {
            label: found.locked ? 'Destravar' : 'Travar',
            icon: found.locked ? 'unlock' : 'lock',
            onSelect: () => updatePlatformProperty(platformId, { locked: found.locked }, { locked: !found.locked }, 'Travar/Destravar'),
          },
          { label: 'Excluir', icon: 'trash', danger: true, onSelect: () => removePlatforms([platformId]) },
        ]
      : [];
  } else if (contextMenu.target.type === 'figure') {
    const figureId = contextMenu.target.figureId;
    const found = figures.find((f) => f.id === figureId);
    items = found
      ? [
          {
            label: 'Renomear',
            onSelect: () => {
              const next = window.prompt('Renomear cenário', found.name);
              if (next && next.trim()) {
                updateFigureProperty(figureId, { name: found.name }, { name: next.trim() }, 'Renomear Cenário');
              }
            },
          },
          {
            label: found.locked ? 'Destravar' : 'Travar',
            icon: found.locked ? 'unlock' : 'lock',
            onSelect: () => updateFigureProperty(figureId, { locked: found.locked }, { locked: !found.locked }, 'Travar/Destravar'),
          },
          { label: 'Excluir', icon: 'trash', danger: true, onSelect: () => removeFigures([figureId]) },
        ]
      : [];
  } else if (contextMenu.target.type === 'device') {
    const deviceId = contextMenu.target.deviceId;
    const found = devices.find((d) => d.id === deviceId);

    items = found
      ? [
          { label: 'Duplicar', icon: 'duplicate', onSelect: () => duplicateDevices([deviceId]) },
          {
            label: 'Renomear',
            onSelect: () => {
              const next = window.prompt('Renomear efeito', found.name);
              if (next && next.trim()) {
                updateDeviceProperty(deviceId, { name: found.name }, { name: next.trim() }, 'Renomear Efeito');
              }
            },
          },
          {
            label: found.locked ? 'Destravar' : 'Travar',
            icon: found.locked ? 'unlock' : 'lock',
            onSelect: () => setDevicesLocked([deviceId], !found.locked),
          },
          ...groups
            .filter((g) => !found.groupIds.includes(g.id))
            .map((g) => ({
              label: `Adicionar a ${g.name}`,
              icon: 'group' as const,
              onSelect: () =>
                updateDeviceProperty(
                  deviceId,
                  { groupIds: found.groupIds },
                  { groupIds: [...found.groupIds, g.id] },
                  'Adicionar ao Grupo',
                ),
            })),
          ...groups
            .filter((g) => found.groupIds.includes(g.id))
            .map((g) => ({
              label: `Remover de ${g.name}`,
              onSelect: () =>
                updateDeviceProperty(
                  deviceId,
                  { groupIds: found.groupIds },
                  { groupIds: found.groupIds.filter((id) => id !== g.id) },
                  'Remover do Grupo',
                ),
            })),
          { label: 'Excluir', icon: 'trash', danger: true, onSelect: () => removeDevices([deviceId]) },
        ]
      : [];
  } else {
    items = [
      { label: 'Colar', disabled: true, onSelect: () => {} },
      { label: 'Selecionar Tudo', onSelect: () => setSelection(devices.map((d) => d.id)) },
      { label: 'Configurações do Palco', icon: 'settings', onSelect: () => setStageSettingsOpen(true) },
    ];
  }

  return <ContextMenu x={contextMenu.x} y={contextMenu.y} items={items} onClose={closeContextMenu} />;
}
