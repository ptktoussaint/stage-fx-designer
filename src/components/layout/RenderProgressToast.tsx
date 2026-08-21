import { useUiStore } from '../../stores/uiStore';
import './RenderProgressToast.css';

/**
 * A small, corner-anchored progress indicator for video export — like a
 * browser's own download notification — instead of making the user watch
 * the stage itself (StageEditor hides the stage view during the fast
 * render; see its `isAutoRendering` overlay) or guess at a button's state.
 */
export function RenderProgressToast() {
  const isAutoRendering = useUiStore((s) => s.isAutoRendering);
  const autoRenderProgress = useUiStore((s) => s.autoRenderProgress);
  const isClipRecording = useUiStore((s) => s.isClipRecording);

  if (!isAutoRendering && !isClipRecording) return null;

  return (
    <div className="render-progress-toast" role="status" aria-live="polite">
      <span className="render-progress-toast__spinner" />
      <span className="render-progress-toast__text">
        {isAutoRendering
          ? `Renderizando vídeo… ${Math.round(autoRenderProgress * 100)}%`
          : 'Gravando vídeo em tempo real…'}
      </span>
    </div>
  );
}
