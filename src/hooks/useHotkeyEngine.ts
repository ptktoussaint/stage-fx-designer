import { useEffect, useRef } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { getDeviceDefinition } from '../devices/registry';
import { eventBus } from '../engine/eventBus';
import { addTimelineEvent, updateTimelineEvent } from '../commands';
import { isTypingInField } from '../utils/dom';

/** Placeholder duration a recorded cue starts at — grown live while the key
 * stays held (see fireForCode) and finalized on release. Small enough to be
 * visually negligible if a hold turns out to be a genuine instant tap. */
const RECORDING_INITIAL_DURATION = 0.05;

/** Minimum time between re-fires of the same held key. Fast enough to read
 * as "sustained" (roughly 4 fires/sec) but nowhere near the browser's raw
 * OS key-repeat rate (often 20-30/sec), which is what froze the app. */
const HOLD_REPEAT_INTERVAL_MS = 250;

/**
 * How long a keyup waits before it's trusted as a real release. Some
 * OS/browser combinations (observed on certain Linux/X11 setups without
 * "detectable autorepeat" enabled) send a genuine keyup immediately
 * followed by a new keydown for EVERY tick of a held key's OS-level
 * typematic repeat, instead of a single sustained keydown with
 * `repeat: true` — so a real physical hold looks, at the DOM event level,
 * indistinguishable from rapid tap-tap-tap-tap. Reacting to every one of
 * those keyups instantly (as a genuine release) killed and instantly
 * recreated the effect on each cycle — the "piscando" (flickering) instead
 * of a steady continuous jet. Debouncing the release absorbs that: a keydown
 * for the same code arriving before this elapses cancels the pending
 * release, so it reads as one continuous hold. Short enough to still feel
 * instant for an intentional tap-and-release.
 */
const RELEASE_DEBOUNCE_MS = 150;

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
 * While Record is armed AND the transport is actually playing, the first
 * fire of a hold also writes a TimelineEvent at the current playhead, so
 * performing the show live builds its timeline as a byproduct. Every
 * following retrigger from the SAME held key extends that one event's
 * duration live (see recordingEvents) instead of writing a new cue every
 * ~250ms — a held hotkey used to record a chain of small overlapping
 * rectangles instead of one continuous marking.
 *
 * Key release fires its own SIMULATION_TRIGGER with action 'stop' (see
 * releaseForCode) — SimulationEffects3D uses this to end a continuous-hold
 * effect (flame/CO2/spark) the instant the key comes up, rather than
 * inferring "released" from a timeout. That's what makes a quick tap read
 * as a quick tap instead of lingering for however long some grace window
 * happened to be.
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
  const pendingReleaseTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  /** In-progress recorded cue per device, while Record is armed and a bound
   * key is held for that device — see the class doc comment above. */
  const recordingEvents = useRef<Map<string, { eventId: string; startTime: number }>>(new Map());

  useEffect(() => {
    const pendingTimers = pendingReleaseTimers.current;
    const recording = recordingEvents.current;

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
          keepAlive: true,
        });

        if (shouldRecord) {
          const inProgress = recording.get(deviceId);
          if (inProgress) {
            // Same held key, same device — grow the existing cue instead of
            // writing another one, so the whole hold ends up as one
            // continuous marking on the timeline.
            const duration = Math.max(RECORDING_INITIAL_DURATION, playback.currentTime - inProgress.startTime);
            useProjectStore.getState()._updateTimelineEvent(inProgress.eventId, { duration });
          } else {
            const eventId = addTimelineEvent({
              time: playback.currentTime,
              duration: RECORDING_INITIAL_DURATION,
              targetType: 'device',
              targetId: deviceId,
              action: 'trigger',
              parameters: {},
            });
            recording.set(deviceId, { eventId, startTime: playback.currentTime });
          }
        }
      });
    };

    const releaseForCode = (code: string) => {
      const { hotkeys, devices } = useProjectStore.getState().project;
      const binding = hotkeys.find((h) => h.code === code);
      if (!binding || binding.deviceIds.length === 0) return;

      binding.deviceIds.forEach((deviceId) => {
        const device = devices.find((d) => d.id === deviceId);
        if (!device || !device.enabled) return;
        const definition = getDeviceDefinition(device.definitionId);
        if (!definition) return;

        // Tells SimulationEffects3D to end this device's continuous-hold
        // effect (flame/CO2/spark) immediately — see its CONTINUOUS_HOLD_TYPES
        // handling. Ignored for one-shot families (mine/comet, ...), which
        // always run their own fixed animation regardless of hold duration.
        eventBus.emit('SIMULATION_TRIGGER', {
          deviceId,
          simulationType: definition.simulationType,
          action: 'stop',
          parameters: {},
        });

        // Finalize the recorded cue grown live in fireForCode, if any —
        // one proper undo-tracked commit for the whole hold, rather than
        // one per retrigger.
        const inProgress = recording.get(deviceId);
        if (inProgress) {
          recording.delete(deviceId);
          const finalEvent = useProjectStore
            .getState()
            .project.timeline.events.find((ev) => ev.id === inProgress.eventId);
          if (finalEvent) {
            updateTimelineEvent(
              inProgress.eventId,
              { duration: RECORDING_INITIAL_DURATION },
              { duration: finalEvent.duration },
            );
          }
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

      // A same-code keydown arriving before a pending release's debounce
      // elapsed means that keyup was an OS-repeat artifact, not a real
      // release — cancel it so the effect keeps reading as one held stream.
      const pending = pendingTimers.get(e.code);
      if (pending != null) {
        clearTimeout(pending);
        pendingTimers.delete(e.code);
      }

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
      if (!heldCodes.current.has(e.code)) return;
      heldCodes.current.delete(e.code);
      lastFireByCode.current.delete(e.code);

      const timer = setTimeout(() => {
        pendingTimers.delete(e.code);
        releaseForCode(e.code);
      }, RELEASE_DEBOUNCE_MS);
      pendingTimers.set(e.code, timer);
    };

    const releaseAllHeld = () => {
      const codes = Array.from(heldCodes.current);
      heldCodes.current.clear();
      lastFireByCode.current.clear();
      // Losing focus entirely — flush right away rather than waiting out
      // the debounce, since no further keydown will arrive to cancel it.
      pendingTimers.forEach((timer) => clearTimeout(timer));
      const pendingCodes = Array.from(pendingTimers.keys());
      pendingTimers.clear();
      new Set([...codes, ...pendingCodes]).forEach(releaseForCode);
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
      pendingTimers.forEach((timer) => clearTimeout(timer));
      pendingTimers.clear();
    };
  }, []);
}
