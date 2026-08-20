import type { Command } from './Command';
import { useProjectStore } from '../stores/projectStore';
import type { TimelineEvent } from '../types';
import { createId } from '../utils/id';
import { eventBus } from '../engine/eventBus';

export class AddTimelineEventCommand implements Command {
  label = 'Add Timeline Event';
  readonly event: TimelineEvent;

  constructor(event: Omit<TimelineEvent, 'id'>) {
    this.event = { ...event, id: createId() };
  }

  execute() {
    useProjectStore.getState()._addTimelineEvent(this.event);
    eventBus.emit('EVENT_ADDED', { event: this.event });
  }

  undo() {
    useProjectStore.getState()._removeTimelineEvent(this.event.id);
    eventBus.emit('EVENT_REMOVED', { eventId: this.event.id });
  }
}

export class UpdateTimelineEventCommand implements Command {
  label = 'Edit Timeline Event';
  private readonly eventId: string;
  private readonly before: Partial<TimelineEvent>;
  private readonly after: Partial<TimelineEvent>;

  constructor(eventId: string, before: Partial<TimelineEvent>, after: Partial<TimelineEvent>) {
    this.eventId = eventId;
    this.before = before;
    this.after = after;
  }

  execute() {
    useProjectStore.getState()._updateTimelineEvent(this.eventId, this.after);
    const event = useProjectStore.getState().project.timeline.events.find((e) => e.id === this.eventId);
    if (event) eventBus.emit('EVENT_UPDATED', { event });
  }

  undo() {
    useProjectStore.getState()._updateTimelineEvent(this.eventId, this.before);
    const event = useProjectStore.getState().project.timeline.events.find((e) => e.id === this.eventId);
    if (event) eventBus.emit('EVENT_UPDATED', { event });
  }
}

export class RemoveTimelineEventCommand implements Command {
  label = 'Delete Timeline Event';
  private readonly removed: TimelineEvent;

  constructor(event: TimelineEvent) {
    this.removed = event;
  }

  execute() {
    useProjectStore.getState()._removeTimelineEvent(this.removed.id);
    eventBus.emit('EVENT_REMOVED', { eventId: this.removed.id });
  }

  undo() {
    useProjectStore.getState()._addTimelineEvent(this.removed);
    eventBus.emit('EVENT_ADDED', { event: this.removed });
  }
}
