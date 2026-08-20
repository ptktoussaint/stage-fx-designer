import { create } from 'zustand';
import { eventBus } from '../engine/eventBus';

interface PlaybackState {
  currentTime: number;
  isPlaying: boolean;

  play: () => void;
  stop: () => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  currentTime: 0,
  isPlaying: false,

  play: () => {
    set({ isPlaying: true });
    eventBus.emit('PLAYBACK_STARTED', { currentTime: get().currentTime });
  },

  stop: () => {
    set({ isPlaying: false });
    eventBus.emit('PLAYBACK_STOPPED', { currentTime: get().currentTime });
  },

  togglePlay: () => {
    if (get().isPlaying) {
      get().stop();
    } else {
      get().play();
    }
  },

  setCurrentTime: (time) => {
    set({ currentTime: Math.max(0, time) });
    eventBus.emit('PLAYHEAD_CHANGED', { currentTime: Math.max(0, time) });
  },
}));
