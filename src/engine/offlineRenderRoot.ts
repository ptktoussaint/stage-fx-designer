import type { RootState } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

/**
 * Holds a reference to the live 3D canvas's react-three-fiber root state
 * (captured via <Canvas onCreated>) and its OrbitControls instance, so the
 * offline show renderer can drive the canvas imperatively — toggle
 * frameloop to 'never', call state.advance(t) frame-by-frame, and swing the
 * camera to a standard show-facing angle for the render — without needing a
 * second, duplicate scene/canvas. Both are re-set on every remount (see
 * StageRenderer3D's Canvas key + OrbitControls ref callback), so this
 * always points at whatever canvas is actually live.
 */
class OfflineRenderRoot {
  private state: RootState | null = null;
  private controls: OrbitControlsImpl | null = null;

  set(state: RootState | null): void {
    this.state = state;
  }

  get(): RootState | null {
    return this.state;
  }

  setControls(controls: OrbitControlsImpl | null): void {
    this.controls = controls;
  }

  getControls(): OrbitControlsImpl | null {
    return this.controls;
  }
}

export const offlineRenderRoot = new OfflineRenderRoot();
