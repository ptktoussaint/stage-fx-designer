import { useProjectStore } from '../stores/projectStore';
import { createId } from '../utils/id';
import type { TimelineFolder } from '../types';

export function deviceTrackKey(id: string): string {
  return `device:${id}`;
}

export function groupTrackKey(id: string): string {
  return `group:${id}`;
}

/**
 * Stable render order: every key already in `trackOrder`, in order,
 * followed by any group/device track that isn't yet in there (a track
 * that's just been added) appended in natural array order — so a new
 * device always shows up without needing to remember to register it here.
 * Anything in trackOrder that no longer corresponds to a real group/device
 * (deleted) is dropped.
 */
export function resolveTrackOrder(trackOrder: string[], groupIds: string[], deviceIds: string[]): string[] {
  const naturalKeys = [...groupIds.map(groupTrackKey), ...deviceIds.map(deviceTrackKey)];
  const naturalSet = new Set(naturalKeys);
  const known = new Set(trackOrder);
  const stillValid = trackOrder.filter((k) => naturalSet.has(k));
  const missing = naturalKeys.filter((k) => !known.has(k));
  return [...stillValid, ...missing];
}

export function addTimelineFolder(name: string): string {
  const { project } = useProjectStore.getState();
  const id = createId();
  const folder: TimelineFolder = { id, name, collapsed: false };
  useProjectStore.getState().setTimelineOrganization({ folders: [...project.timeline.folders, folder] });
  return id;
}

export function renameTimelineFolder(folderId: string, name: string): void {
  const { project } = useProjectStore.getState();
  useProjectStore.getState().setTimelineOrganization({
    folders: project.timeline.folders.map((f) => (f.id === folderId ? { ...f, name } : f)),
  });
}

export function removeTimelineFolder(folderId: string): void {
  const { project } = useProjectStore.getState();
  const trackFolder = { ...project.timeline.trackFolder };
  for (const key of Object.keys(trackFolder)) {
    if (trackFolder[key] === folderId) delete trackFolder[key];
  }
  useProjectStore.getState().setTimelineOrganization({
    folders: project.timeline.folders.filter((f) => f.id !== folderId),
    trackFolder,
  });
}

export function toggleTimelineFolderCollapsed(folderId: string): void {
  const { project } = useProjectStore.getState();
  useProjectStore.getState().setTimelineOrganization({
    folders: project.timeline.folders.map((f) => (f.id === folderId ? { ...f, collapsed: !f.collapsed } : f)),
  });
}

export function setTrackFolder(trackKey: string, folderId: string | null): void {
  const { project } = useProjectStore.getState();
  const trackFolder = { ...project.timeline.trackFolder };
  if (folderId) trackFolder[trackKey] = folderId;
  else delete trackFolder[trackKey];
  useProjectStore.getState().setTimelineOrganization({ trackFolder });
}

/**
 * Swaps `trackKey` with its neighbor among tracks sharing the same folder
 * membership (both ungrouped, or both in the same folder) — reordering
 * never crosses in or out of a folder, only "assign to folder" does that.
 * `resolvedOrder` is whatever resolveTrackOrder() produced for the current
 * render, so this always operates on the order actually on screen.
 */
export function moveTrackOrder(trackKey: string, direction: -1 | 1, resolvedOrder: string[]): void {
  const { project } = useProjectStore.getState();
  const trackFolder = project.timeline.trackFolder;
  const myFolder = trackFolder[trackKey] ?? null;
  const siblings = resolvedOrder.filter((k) => (trackFolder[k] ?? null) === myFolder);
  const idx = siblings.indexOf(trackKey);
  const swapIdx = idx + direction;
  if (idx === -1 || swapIdx < 0 || swapIdx >= siblings.length) return;
  const swapKey = siblings[swapIdx];
  const idxA = resolvedOrder.indexOf(trackKey);
  const idxB = resolvedOrder.indexOf(swapKey);
  const next = [...resolvedOrder];
  [next[idxA], next[idxB]] = [next[idxB], next[idxA]];
  useProjectStore.getState().setTimelineOrganization({ trackOrder: next });
}

/**
 * Drag-and-drop reorder: moves `draggedKey` to sit right before/after
 * `targetKey`. Like moveTrackOrder, stays within the same folder membership
 * (dropping on a track in a different folder/section is a no-op) — dragging
 * a track between folders is "Assign to Folder", not this.
 */
export function reorderTrack(draggedKey: string, targetKey: string, insertAfter: boolean, resolvedOrder: string[]): void {
  if (draggedKey === targetKey) return;
  const { project } = useProjectStore.getState();
  const trackFolder = project.timeline.trackFolder;
  const draggedFolder = trackFolder[draggedKey] ?? null;
  const targetFolder = trackFolder[targetKey] ?? null;
  if (draggedFolder !== targetFolder) return;

  const withoutDragged = resolvedOrder.filter((k) => k !== draggedKey);
  let insertAt = withoutDragged.indexOf(targetKey);
  if (insertAt === -1) return;
  if (insertAfter) insertAt += 1;
  const next = [...withoutDragged.slice(0, insertAt), draggedKey, ...withoutDragged.slice(insertAt)];
  useProjectStore.getState().setTimelineOrganization({ trackOrder: next });
}
