import { useEffect, useRef } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { getDeviceDefinition } from '../devices/registry';
import { eventBus } from '../engine/eventBus';
import { addTimelineEvent } from '../commands';
import { isTypingInField } from '../utils/dom';

/** Minimum time between re-fires of the same held key. Fast enough to read
 * as "sustained" (roughly 4 fires/sec) but nowhere near the browser's raw
 * OS key-repeat rate (often 20-30/sec), which is what froze the app. */
const HOLD_REPEAT_INTERVAL_MS = 250;

/**
 * Live-performance trigger engine: press a bound key, fire the effect(s) on
 * its devices immediately via the same SIMULATION_TRIGGER the Show Engine
 * and Inspector's "Test Trigger" use — so the 2D pulse and 3D effect react
 * with no extra wiring here. Holding the key keeps firing it at a capped
 * rate (see HOLD_REPEAT_INTERVAL_MS) rather than either a single one-shot
 * or the browser's raw, much faster key-repeat rate — sustained effects
 * (fire held over a phrase, etc.) are meant to work, they just can't spawn
 * faster than the app can render. While Record is armed AND the transport
 * is actually playing, each allowed fire also writes a TimelineEvent at
 * the current playhead, so performing the show live builds its timeline
 * as a byproduct — a long hold becomes a burst of cues, same as it looked.
 *
 * Mount once near the app root, alongside useKeyboardShortcuts. While a
 * HotkeyCaptureButton is actively listening it uses a capture-phase
 * `stopPropagation()`, which halts this bubble-phase listener too — so a
 * binding never fires accidentally while the user is busy assigning one.
 */
export function useHotkeyEngine(): void {
  const lastFireByCode = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingInField(e.target)) return;

      const { hotkeys, devices } = useProjectStore.getState().project;
      const binding = hotkeys.find((h) => h.code === e.code);
      if (!binding || binding.deviceIds.length === 0) return;
      e.preventDefault();

      if (e.repeat) {
        const last = lastFireByCode.current.get(e.code) ?? 0;
        const now = performance.now();
        if (now - last < HOLD_REPEAT_INTERVAL_MS) return;
      }
      lastFireByCode.current.set(e.code, performance.now());

      const playback = usePlaybackStore.getState();
      const shouldRecord = playback.isRecording && playback.isPlaying;

      binding.deviceIds.forEach((deviceId) => {
        const device = devices.find((d) => d.id === deviceId);
        if (!device || !device.enabled) return;
        const definition = getDeviceDefinition(device.definitionId);
        if (!definition) return;

        eventBus.emit('SIMULATION_TRIGGER', {
          deviceId,
          simulationType: definition.simulationType,
          action: 'trigger',
          parameters: { ...definition.defaultParameters, ...device.customProperties },
        });

        if (shouldRecord) {
          addTimelineEvent({
            time: playback.currentTime,
            duration: 0.5,
            targetType: 'device',
            targetId: deviceId,
            action: 'trigger',
            parameters: {},
          });
        }
      });
    };

    const onKeyUp = (e: KeyboardEvent) => {
      lastFireByCode.current.delete(e.code);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);
}
