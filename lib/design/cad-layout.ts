import { closeRing, lngLatToLocalMeters } from "./geo";
import type { LngLat, Ring, SiteFeature } from "./types";

export const CAD_LAYERS = {
  parcel: { name: "SITE_BOUNDARY", color: 4 },
  setback: { name: "SETBACK", color: 2 },
  pad: { name: "BUILDING_PAD", color: 7 },
  parking: { name: "PARKING", color: 8 },
} as const;

export type CadLayerKey = keyof typeof CAD_LAYERS;

export type CadPolyline = {
  layer: string;
  color: number;
  vertices: [number, number][];
};

export function layoutOrigin(features: SiteFeature[]): LngLat {
  return (
    features.find((feature) => feature.kind === "parcel")?.ring[0] ??
    features[0]?.ring[0] ??
    ([0, 0] as LngLat)
  );
}

export function ringToLocalVertices(ring: Ring, origin: LngLat): [number, number][] {
  const closed = closeRing(ring);
  return closed.slice(0, -1).map(([lng, lat]) => lngLatToLocalMeters(lng, lat, origin));
}

/** Closed polylines in local meters, matching the DXF/DWG site layout. */
export function layoutPolylines(features: SiteFeature[], setback: Ring | null): CadPolyline[] {
  const origin = layoutOrigin(features);
  const polylines: CadPolyline[] = [];

  for (const feature of features) {
    if (feature.kind === "mark") continue;
    const layer = CAD_LAYERS[feature.kind];
    const vertices = ringToLocalVertices(feature.ring, origin);
    if (vertices.length < 3) continue;
    polylines.push({ layer: layer.name, color: layer.color, vertices });
  }

  if (setback) {
    const vertices = ringToLocalVertices(setback, origin);
    if (vertices.length >= 3) {
      polylines.push({
        layer: CAD_LAYERS.setback.name,
        color: CAD_LAYERS.setback.color,
        vertices,
      });
    }
  }

  return polylines;
}
