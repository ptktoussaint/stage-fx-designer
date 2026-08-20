/**
 * A live-performance trigger: press a physical key, fire the effect(s) on
 * the listed devices immediately (same SIMULATION_TRIGGER pipeline as the
 * Show Engine and the Inspector's "Test Trigger" — the 2D pulse and 3D
 * effect both already react to it with no extra wiring).
 *
 * `code` is a KeyboardEvent.code value (e.g. "Numpad1", "KeyQ", "F13",
 * "MediaPlayPause") — physical/layout-independent and works for extended
 * keys, not just standard alphanumeric ones.
 *
 * `deviceIds` is a resolved snapshot, not a live Group reference: binding a
 * hotkey to multiple devices ("Numpad1 = Fire 1 + Fire 4") doesn't require
 * first creating a formal Group — you just select the devices and assign.
 * If a bound device is later deleted, it's silently dropped when the
 * binding fires (see hotkeyEngine).
 */
export interface HotkeyBinding {
  id: string;
  code: string;
  /** Display label for the key, e.g. "Numpad 1" — derived at assignment time so the UI never needs to re-decode `code`. */
  keyLabel: string;
  /** User-facing name for the cue, e.g. "Chorus Blast". Defaults to the device name(s). */
  name: string;
  deviceIds: string[];
}
