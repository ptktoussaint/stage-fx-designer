import { useEffect } from 'react';
import { useSelectionStore } from '../stores/selectionStore';
import { useProjectStore } from '../stores/projectStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { undo, redo, removeDevices, duplicateDevices, createGroup } from '../commands';
import { saveProjectToLocal } from '../persistence/autosave';

const GROUP_COLORS = ['#4f8cff', '#e0693f', '#4bbf7a', '#d6a23c', '#a06fe0', '#4fb8d6'];

function isTypingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

/** Mount once near the app root. Professional-editor shortcut set (see spec §20). */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      const typing = isTypingInField(e.target);

      if (e.key === 'Escape') {
        useSelectionStore.getState().clear();
        (document.activeElement as HTMLElement | null)?.blur?.();
        return;
      }

      if (typing) return;

      if (isMeta && e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateDevices(useSelectionStore.getState().selectedDeviceIds);
        return;
      }
      if (isMeta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveProjectToLocal(useProjectStore.getState().project);
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        useSelectionStore.getState().setSelection(useProjectStore.getState().project.devices.map((d) => d.id));
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = useSelectionStore.getState().selectedDeviceIds;
        if (selected.length > 0) {
          e.preventDefault();
          removeDevices(selected);
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        usePlaybackStore.getState().togglePlay();
        return;
      }

      if (e.key.toLowerCase() === 'g') {
        const selected = useSelectionStore.getState().selectedDeviceIds;
        if (selected.length > 0) {
          const name = window.prompt('Group name');
          if (name && name.trim()) {
            const groupCount = useProjectStore.getState().project.groups.length;
            createGroup(name.trim(), selected, GROUP_COLORS[groupCount % GROUP_COLORS.length]);
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
