import { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { debounce, loadProjectFromLocal, saveProjectToLocal } from '../persistence/autosave';
import { loadAudioBlob } from '../persistence/audioStorage';
import { audioEngine } from '../engine/audioEngine';
import { usePlaybackStore } from '../stores/playbackStore';

export type AutosaveStatus = 'loading' | 'idle' | 'saving' | 'saved' | 'error';

/**
 * On mount: restores the last autosaved project (survives refresh, accidental
 * close, or a browser crash). After that, every project change is persisted
 * to IndexedDB on a debounce so typing/dragging doesn't thrash writes.
 */
export function useAutosave(): AutosaveStatus {
  const [status, setStatus] = useState<AutosaveStatus>('loading');
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadProjectFromLocal()
      .then(async (project) => {
        if (cancelled) return;
        if (project) {
          useProjectStore.getState()._setProject(project);
          // project.audio.sourceUrl (if any) is a blob: URL from a previous
          // page session and is already dead — the raw bytes live in a
          // separate IndexedDB entry (see persistence/audioStorage.ts) and
          // need a fresh object URL each time the app loads.
          if (project.audio.fileName) {
            const stored = await loadAudioBlob();
            if (!cancelled && stored) {
              const freshUrl = URL.createObjectURL(stored.blob);
              audioEngine.load(freshUrl, () => usePlaybackStore.getState().stop());
              useProjectStore.getState().setAudio({ sourceUrl: freshUrl });
            } else if (!cancelled) {
              useProjectStore.getState().setAudio({
                sourceUrl: null,
                fileName: null,
                duration: null,
                waveformPeaks: null,
              });
            }
          }
        }
        hasLoadedRef.current = true;
        setStatus('idle');
      })
      .catch(() => {
        hasLoadedRef.current = true;
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const debouncedSave = debounce((project: ReturnType<typeof useProjectStore.getState>['project']) => {
      setStatus('saving');
      saveProjectToLocal(project)
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'));
    }, 800);

    const unsubscribe = useProjectStore.subscribe((state) => {
      if (!hasLoadedRef.current) return;
      debouncedSave(state.project);
    });

    // The debounce above trades write frequency for a small staleness
    // window; flush immediately when the tab is about to disappear so an
    // accidental close/refresh never loses the last in-flight edit.
    const flushNow = () => {
      if (!hasLoadedRef.current) return;
      void saveProjectToLocal(useProjectStore.getState().project);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushNow();
    };
    window.addEventListener('pagehide', flushNow);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      unsubscribe();
      window.removeEventListener('pagehide', flushNow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return status;
}
