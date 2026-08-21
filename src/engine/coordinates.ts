/**
 * The Stage Editor's only boundary between "meters" (the data model) and
 * "pixels" (rendering). Nothing outside a renderer should call these.
 */
export function metersToPixels(meters: number, pixelsPerMeter: number): number {
  return meters * pixelsPerMeter;
}

export function pixelsToMeters(pixels: number, pixelsPerMeter: number): number {
  return pixels / pixelsPerMeter;
}

/** Base scale shown at zoom = 1. */
export const BASE_PIXELS_PER_METER = 40;

export function pixelsPerMeterForZoom(zoom: number): number {
  return BASE_PIXELS_PER_METER * zoom;
}

/**
 * The 3D deck box's top face sits at three.y=0 (device.position.z=0 means
 * "resting on the stage surface"), but the front-margin floor sits a full
 * stage.height BELOW that — it's the real ground the deck rises out of, not
 * a continuation of the deck surface. Anything positioned off-stage
 * (project.y < 0) with z=0 previously rendered floating stage.height above
 * that floor. This returns the elevation of "z=0" for a given project.y, so
 * every 3D renderer (device/platform/figure meshes, simulation effects) can
 * compute `three.y = localFloorElevation(position.y, stage) + position.z`
 * and get an object that rests on whichever surface it's actually over.
 */
export function localFloorElevation(projectY: number, stageHeight: number): number {
  return projectY < 0 ? -stageHeight : 0;
}
