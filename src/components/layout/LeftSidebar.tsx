import { useUiStore } from '../../stores/uiStore';
import { FxLibraryPanel } from '../fxLibrary/FxLibraryPanel';
import { SceneryLibraryPanel } from '../scenery/SceneryLibraryPanel';
import { ResizeHandle } from '../common/ResizeHandle';
import '../fxLibrary/FxLibraryPanel.css';

export function LeftSidebar() {
  const width = useUiStore((s) => s.leftSidebarWidth);
  const setWidth = useUiStore((s) => s.setLeftSidebarWidth);
  const tab = useUiStore((s) => s.leftSidebarTab);
  const setTab = useUiStore((s) => s.setLeftSidebarTab);

  return (
    <div className="app-panel app-panel--left" style={{ width, display: 'flex', flexDirection: 'column' }}>
      <div className="fx-library__tabs">
        <button type="button" className={tab === 'fx' ? 'fx-library__tab is-active' : 'fx-library__tab'} onClick={() => setTab('fx')}>
          FX
        </button>
        <button
          type="button"
          className={tab === 'scenery' ? 'fx-library__tab is-active' : 'fx-library__tab'}
          onClick={() => setTab('scenery')}
        >
          Cenário
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{tab === 'fx' ? <FxLibraryPanel /> : <SceneryLibraryPanel />}</div>
      <ResizeHandle
        direction="horizontal"
        onResize={(dx) => setWidth(useUiStore.getState().leftSidebarWidth + dx)}
      />
    </div>
  );
}
