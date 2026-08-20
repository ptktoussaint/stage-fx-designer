import { create } from 'zustand';
import type { Command } from '../commands/Command';
import { useProjectStore } from './projectStore';
import { saveProjectToLocal } from '../persistence/autosave';

const MAX_HISTORY = 200;

/**
 * Every discrete, undoable mutation passes through execute/undo/redo below
 * — the single chokepoint the Command Pattern exists to provide (see the
 * doc comment on projectStore's `_`-prefixed methods). useAutosave's
 * subscribe-based save is debounced (deliberately, so a live drag doesn't
 * thrash IndexedDB writes every frame), but that debounce window is exactly
 * where a fast reload/tab-close can lose a just-committed change: delete a
 * cue, refresh before the debounce fires, and the deleted cue reloads right
 * back in — "no matter what I delete, it stays saved." Flushing here,
 * immediately and un-debounced, closes that window for every command-based
 * action without touching the debounce that keeps continuous edits cheap.
 */
function flushAutosaveNow(): void {
  void saveProjectToLocal(useProjectStore.getState().project);
}

interface HistoryState {
  undoStack: Command[];
  redoStack: Command[];

  execute: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],

  execute: (command) => {
    const { undoStack } = get();
    const last = undoStack[undoStack.length - 1];
    const merged = last?.mergeWith?.(command);

    command.execute();
    flushAutosaveNow();

    if (merged) {
      set({ undoStack: [...undoStack.slice(0, -1), merged], redoStack: [] });
      return;
    }

    const nextStack = [...undoStack, command].slice(-MAX_HISTORY);
    set({ undoStack: nextStack, redoStack: [] });
  },

  undo: () => {
    const { undoStack, redoStack } = get();
    const command = undoStack[undoStack.length - 1];
    if (!command) return;
    command.undo();
    flushAutosaveNow();
    set({ undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, command] });
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    const command = redoStack[redoStack.length - 1];
    if (!command) return;
    command.execute();
    flushAutosaveNow();
    set({ undoStack: [...undoStack, command], redoStack: redoStack.slice(0, -1) });
  },

  clear: () => set({ undoStack: [], redoStack: [] }),
}));
