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
 * with no extra wiring here.
 *
 * Sustained firing while a key is held is driven by our OWN rAF loop over a
 * `heldCodes` set, NOT by the browser's native keydown `repeat` events. Most
 * OSes only apply typematic auto-repeat to the single most-recently-pressed
 * key — earlier keys stay physically held but stop producing new keydown
 * events — so relying on `e.repeat` meant holding two+ bound keys at once
 * silently dropped all but the last one back to a single shot. Tracking
 * "currently held" ourselves and ticking every held code independently at
 * HOLD_REPEAT_INTERVAL_MS fixes that regardless of how many keys are held.
 * While Record is armed AND the transport is actually playing, each allowed
 * fire also writes a TimelineEvent at the current playhead, so performing
 * the show live builds its timeline as a byproduct.
 *
 * Mount once near the app root, alongside useKeyboardShortcuts. While a
 * HotkeyCaptureButton is actively listening it uses a capture-phase
 * `stopPropagation()`, which halts this bubble-phase listener too — so a
 * binding never fires accidentally while the user is busy assigning one.
 */
export function useHotkeyEngine(): void {
  const heldCodes = useRef<Set<string>>(new Set());
  const lastFireByCode = useRef<Map<string, number>>(new Map());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const fireForCode = (code: string) => {
      const { hotkeys, devices } = useProjectStore.getState().project;
      const binding = hotkeys.find((h) => h.code === code);
      if (!binding || binding.deviceIds.length === 0) return;

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

    const tick = () => {
      const now = performance.now();
      heldCodes.current.forEach((code) => {
        const last = lastFireByCode.current.get(code) ?? 0;
        if (now - last >= HOLD_REPEAT_INTERVAL_MS) {
          lastFireByCode.current.set(code, now);
          fireForCode(code);
        }
      });
      rafRef.current = heldCodes.current.size > 0 ? requestAnimationFrame(tick) : null;
    };

    const ensureLoopRunning = () => {
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingInField(e.target)) return;
      const { hotkeys } = useProjectStore.getState().project;
      const binding = hotkeys.find((h) => h.code === e.code);
      if (!binding || binding.deviceIds.length === 0) return;
      e.preventDefault();

      // Own repeat loop drives sustained firing; ignore the OS's typematic
      // repeat entirely (see doc comment above for why it can't be trusted).
      if (e.repeat) return;
      if (heldCodes.current.has(e.code)) return;

      heldCodes.current.add(e.code);
      lastFireByCode.current.set(e.code, performance.now());
      fireForCode(e.code);
      ensureLoopRunning();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldCodes.current.delete(e.code);
      lastFireByCode.current.delete(e.code);
    };

    const releaseAllHeld = () => {
      heldCodes.current.clear();
      lastFireByCode.current.clear();
    };

    const onVisibilityChange = () => {
      if (document.hidden) releaseAllHeld();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseAllHeld);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseAllHeld);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);
}
