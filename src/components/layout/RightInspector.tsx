import { useUiStore } from '../../stores/uiStore';
import { InspectorPanel } from '../inspector/InspectorPanel';
import { ResizeHandle } from '../common/ResizeHandle';

export function RightInspector() {
  const width = useUiStore((s) => s.rightInspectorWidth);
  const setWidth = useUiStore((s) => s.setRightInspectorWidth);

  return (
    <div className="app-panel app-panel--right" style={{ width }}>
      <ResizeHandle
        direction="horizontal"
        onResize={(dx) => setWidth(useUiStore.getState().rightInspectorWidth - dx)}
      />
      <InspectorPanel />
    </div>
  );
}
