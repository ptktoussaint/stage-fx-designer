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

export interface TimelineData {
  events: TimelineEvent[];
}
