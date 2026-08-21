import '../../engine/simulationEngine'; // registers the ShowEngine -> SimulationEngine bridge (side-effect import)
import { useAutosave } from '../../hooks/useAutosave';
import { useShowEngineLoop } from '../../hooks/useShowEngineLoop';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useHotkeyEngine } from '../../hooks/useHotkeyEngine';
import { TopToolbar } from './TopToolbar';
import { LeftSidebar } from './LeftSidebar';
import { CenterWorkspace } from './CenterWorkspace';
import { RightInspector } from './RightInspector';
import { BottomTimelinePanel } from './BottomTimelinePanel';
import { AppContextMenu } from './AppContextMenu';
import { RenderProgressToast } from './RenderProgressToast';
import './AppShell.css';

export function AppShell() {
  const autosaveStatus = useAutosave();
  useShowEngineLoop();
  useKeyboardShortcuts();
  useHotkeyEngine();

  if (autosaveStatus === 'loading') {
    return <div className="app-shell app-shell--loading">Carregando projeto…</div>;
  }

  return (
    <div className="app-shell">
      <TopToolbar />
      <div className="app-shell__body">
        <LeftSidebar />
        <CenterWorkspace />
        <RightInspector />
      </div>
      <BottomTimelinePanel />
      <AppContextMenu />
      <RenderProgressToast />
    </div>
  );
}
