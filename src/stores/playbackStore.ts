import { create } from 'zustand';
import { eventBus } from '../engine/eventBus';
import { audioEngine } from '../engine/audioEngine';
import { showEngine } from '../engine/showEngine';
import { useProjectStore } from './projectStore';

interface PlaybackState {
  currentTime: number;
  isPlaying: boolean;
  /** While true AND isPlaying, hotkeyEngine also writes a TimelineEvent for every trigger it fires (see hotkeyEngine.ts). */
  isRecording: boolean;

  play: () => void;
  stop: () => void;
  togglePlay: () => void;
  toggleRecording: () => void;
  /** Per-frame clock update from useShowEngineLoop — does not seek audio or reset the Show Engine. */
  setCurrentTime: (time: number) => void;
  /** User-initiated jump (ruler scrub, "restart") — seeks audio and resyncs the Show Engine so skipped cues don't burst-fire. */
  seek: (time: number) => void;
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  currentTime: 0,
  isPlaying: false,
  isRecording: false,

  play: () => {
    // Pressing Play outside the trimmed window (before trimStart, or past a
    // set trimEnd — e.g. after the last pass auto-stopped there) snaps back
    // to trimStart first, so trimming actually constrains playback rather
    // than just being a visual marker on the waveform.
    const { trimStart, trimEnd } = useProjectStore.getState().project.audio;
    const current = get().currentTime;
    if (current < trimStart || (trimEnd != null && current >= trimEnd)) {
      get().seek(trimStart);
    }
    audioEngine.play();
    set({ isPlaying: true });
    eventBus.emit('PLAYBACK_STARTED', { currentTime: get().currentTime });
  },

  stop: () => {
    audioEngine.pause();
    // Recording only makes sense while the transport is actually moving;
    // stopping playback always stops a recording pass too so the next Play
    // doesn't silently resume writing cues the user didn't ask for.
    set({ isPlaying: false, isRecording: false });
    eventBus.emit('PLAYBACK_STOPPED', { currentTime: get().currentTime });
  },

  togglePlay: () => {
    if (get().isPlaying) {
      get().stop();
    } else {
      get().play();
    }
  },

  toggleRecording: () => set((s) => ({ isRecording: !s.isRecording })),

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
