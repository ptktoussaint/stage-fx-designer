import { create } from 'zustand';
import { eventBus } from '../engine/eventBus';
import { audioEngine } from '../engine/audioEngine';
import { showEngine } from '../engine/showEngine';

interface PlaybackState {
  currentTime: number;
  isPlaying: boolean;

  play: () => void;
  stop: () => void;
  togglePlay: () => void;
  /** Per-frame clock update from useShowEngineLoop — does not seek audio or reset the Show Engine. */
  setCurrentTime: (time: number) => void;
  /** User-initiated jump (ruler scrub, "restart") — seeks audio and resyncs the Show Engine so skipped cues don't burst-fire. */
  seek: (time: number) => void;
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  currentTime: 0,
  isPlaying: false,

  play: () => {
    audioEngine.play();
    set({ isPlaying: true });
    eventBus.emit('PLAYBACK_STARTED', { currentTime: get().currentTime });
  },

  stop: () => {
    audioEngine.pause();
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
    const clamped = Math.max(0, time);
    set({ currentTime: clamped });
    eventBus.emit('PLAYHEAD_CHANGED', { currentTime: clamped });
  },

  seek: (time) => {
    const clamped = Math.max(0, time);
    audioEngine.seek(clamped);
    showEngine.reset(clamped);
    set({ currentTime: clamped });
    eventBus.emit('PLAYHEAD_CHANGED', { currentTime: clamped });
  },
}));
