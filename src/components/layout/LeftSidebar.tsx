import { useUiStore } from '../../stores/uiStore';
import { FxLibraryPanel } from '../fxLibrary/FxLibraryPanel';
import { ResizeHandle } from '../common/ResizeHandle';

export function LeftSidebar() {
  const width = useUiStore((s) => s.leftSidebarWidth);
  const setWidth = useUiStore((s) => s.setLeftSidebarWidth);

  return (
    <div className="app-panel app-panel--left" style={{ width }}>
      <FxLibraryPanel />
      <ResizeHandle
        direction="horizontal"
        onResize={(dx) => setWidth(useUiStore.getState().leftSidebarWidth + dx)}
      />
    </div>
  );
}
