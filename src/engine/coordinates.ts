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
