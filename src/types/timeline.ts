export type TimelineTargetType = 'device' | 'group';

/**
 * Extensible action vocabulary. "trigger" fires the device's default simulation once;
 * other actions are reserved for future parameter automation (intensity ramps, etc.).
 */
export type TimelineAction = 'trigger' | 'stop' | 'setParameter';

/**
 * A single scheduled instruction on the timeline.
 * Time and duration are ALWAYS stored as decimal seconds — never as formatted
 * timestamp strings. Formatting to mm:ss.mmm happens only at render time
 * (see src/utils/time.ts).
 */
export interface TimelineEvent {
  id: string;
  /** Start time in seconds, e.g. 63.45 */
  time: number;
  /** Duration in seconds, 0 for instantaneous triggers. */
  duration: number;
  targetType: TimelineTargetType;
  targetId: string;
  action: TimelineAction;
  parameters: Record<string, number | string | boolean>;
}

/** A collapsible folder for organizing timeline tracks — purely a display
 * grouping (like a layer-panel folder), unrelated to Group (which groups
 * devices for simultaneous triggering). */
export interface TimelineFolder {
  id: string;
  name: string;
  collapsed: boolean;
}

export interface TimelineData {
  events: TimelineEvent[];
  folders: TimelineFolder[];
  /** Every track's key ("device:<id>" or "group:<id>") in display order —
   * a flat order shared across ungrouped tracks and every folder's
   * members alike; rendering filters this down per context. A device or
   * group whose key isn't in here yet (just added) renders after
   * everything that is, in its natural devices/groups array position, so
   * nothing elsewhere needs to remember to push into this list. */
  trackOrder: string[];
  /** Track key -> folder id, for a track nested inside a folder. A track
   * with no entry here is ungrouped (rendered at the top level). */
  trackFolder: Record<string, string>;
}
