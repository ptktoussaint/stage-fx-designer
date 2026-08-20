/**
 * Command Pattern for Undo/Redo.
 *
 * Chosen over a full state-snapshot history because the project document
 * will grow large (many devices + many timeline events); diffing whole
 * snapshots on every drag frame would be wasteful and would make merging
 * "move device" drag-steps into one undo entry awkward. Each user-visible
 * action becomes one Command with a precise `undo`, so history stays cheap
 * and semantically meaningful ("Undo Move FIRE 01" rather than "Undo State
 * #482").
 */
export interface Command {
  /** Human-readable label, e.g. "Move FIRE 01" — shown in Undo/Redo tooltips. */
  label: string;
  execute(): void;
  undo(): void;
  /**
   * Optional: merge a same-typed follow-up command into this one instead of
   * pushing a new history entry. Used for continuous drags so every
   * mousemove frame doesn't become its own undo step.
   */
  mergeWith?(next: Command): Command | null;
}
