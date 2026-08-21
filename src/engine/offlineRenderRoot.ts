import type { RootState } from '@react-three/fiber';

/**
 * Holds a reference to the live 3D canvas's react-three-fiber root state
 * (captured via <Canvas onCreated>) so the offline show renderer can drive
 * it imperatively — toggle frameloop to 'never' and call state.advance(t)
 * frame-by-frame — without needing a second, duplicate scene/canvas.
 */
class OfflineRenderRoot {
  private state: RootState | null = null;

  set(state: RootState | null): void {
    this.state = state;
  }

  get(): RootState | null {
    return this.state;
  }
}

export const offlineRenderRoot = new OfflineRenderRoot();
