import { create } from 'zustand';
import type { Command } from '../commands/Command';

const MAX_HISTORY = 200;

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
    set({ undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, command] });
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    const command = redoStack[redoStack.length - 1];
    if (!command) return;
    command.execute();
    set({ undoStack: [...undoStack, command], redoStack: redoStack.slice(0, -1) });
  },

  clear: () => set({ undoStack: [], redoStack: [] }),
}));
