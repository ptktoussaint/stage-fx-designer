import { useEffect } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { getDeviceDefinition } from '../devices/registry';
import { eventBus } from '../engine/eventBus';
import { addTimelineEvent } from '../commands';
import { isTypingInField } from '../utils/dom';

/**
 * Live-performance trigger engine: press a bound key, fire the effect(s) on
 * its devices immediately via the same SIMULATION_TRIGGER the Show Engine
 * and Inspector's "Test Trigger" use — so the 2D pulse and 3D effect react
 * with no extra wiring here. While Record is armed AND the transport is
 * actually playing, each fire also writes a TimelineEvent at the current
 * playhead, so performing the show live builds its timeline as a byproduct.
 *
 * Mount once near the app root, alongside useKeyboardShortcuts. While a
 * HotkeyCaptureButton is actively listening it uses a capture-phase
 * `stopPropagation()`, which halts this bubble-phase listener too — so a
 * binding never fires accidentally while the user is busy assigning one.
 */
export function useHotkeyEngine(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Holding a key makes the browser resend keydown at OS repeat-rate
      // (often 20-30/sec) — without this guard, holding one hotkey spawns
      // dozens of SIMULATION_TRIGGERs a second (each spawning its own 3D
      // particle batch) and, while recording, dozens of near-duplicate
      // TimelineEvents. One physical press should fire once.
      if (e.repeat) return;
      if (isTypingInField(e.target)) return;

      const { hotkeys, devices } = useProjectStore.getState().project;
      const binding = hotkeys.find((h) => h.code === e.code);
      if (!binding || binding.deviceIds.length === 0) return;
      e.preventDefault();

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

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
