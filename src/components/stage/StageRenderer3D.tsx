/**
 * Placeholder. The data model (DeviceInstance.position/rotation already
 * carrying x/y/z) is renderer-agnostic on purpose — see StageEditor.tsx —
 * so a real 3D renderer (e.g. react-three-fiber) can be dropped in here
 * later without touching the project schema or any command.
 */
export function StageRenderer3D() {
  return (
    <div className="stage-renderer-3d-placeholder">
      <div>
        <div className="stage-renderer-3d-placeholder__title">3D View</div>
        <div className="stage-renderer-3d-placeholder__subtitle">
          Coming soon — the stage model already stores height (Z) and rotation for every device.
        </div>
      </div>
    </div>
  );
}
