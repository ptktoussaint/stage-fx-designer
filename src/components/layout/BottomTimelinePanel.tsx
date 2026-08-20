import { useUiStore } from '../../stores/uiStore';
import { TimelinePanel } from '../timeline/TimelinePanel';
import { ResizeHandle } from '../common/ResizeHandle';

const COLLAPSED_HEIGHT = 28;

export function BottomTimelinePanel() {
  const height = useUiStore((s) => s.timelineHeight);
  const setHeight = useUiStore((s) => s.setTimelineHeight);
  const isCollapsed = useUiStore((s) => s.isTimelineCollapsed);

  return (
    <div className="app-panel app-panel--bottom" style={{ height: isCollapsed ? COLLAPSED_HEIGHT : height }}>
      {!isCollapsed && (
        <ResizeHandle
          direction="vertical"
          onResize={(dy) => setHeight(useUiStore.getState().timelineHeight - dy)}
        />
      )}
      <TimelinePanel />
    </div>
  );
}
