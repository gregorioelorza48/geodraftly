import { area, bbox, buffer, centroid, featureCollection, lineString, polygon } from "@turf/turf";
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";
import { SETBACK_FT, type LngLat, type Ring, type SiteFeature } from "./types";

export function closeRing(ring: Ring): Ring {
  if (ring.length === 0) return ring;
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  if (fx === lx && fy === ly) return ring;
  return [...ring, ring[0]];
}

export function ringToPolygon(ring: Ring) {
  const closed = closeRing(ring);
  if (closed.length < 4) return null;
  return polygon([closed]);
}

export function polygonOuterRing(geometry: Polygon | MultiPolygon): Ring | null {
  if (geometry.type === "Polygon") {
    return (geometry.coordinates[0] ?? []).map(([lng, lat]) => [lng, lat] as LngLat);
  }
  const parts = geometry.coordinates;
  if (!parts.length) return null;
  let best = parts[0][0] ?? [];
  for (const poly of parts) {
    if ((poly[0]?.length ?? 0) > best.length) best = poly[0];
  }
  return best.map(([lng, lat]) => [lng, lat] as LngLat);
}

export function featureBounds(features: SiteFeature[]) {
  const polys = features.map((f) => ringToPolygon(f.ring)).filter(Boolean);
  if (!polys.length) return null;
  return bbox(featureCollection(polys as Feature<Polygon>[]));
}

export function featureCenter(features: SiteFeature[]): LngLat | null {
  const polys = features.map((f) => ringToPolygon(f.ring)).filter(Boolean);
  if (!polys.length) return null;
  const c = centroid(featureCollection(polys as Feature<Polygon>[]));
  return c.geometry.coordinates as LngLat;
}

export function insetRing(ring: Ring, feet = SETBACK_FT): Ring | null {
  const poly = ringToPolygon(ring);
  if (!poly) return null;
  try {
    const inset = buffer(poly, -Math.abs(feet), { units: "feet" });
    if (!inset) return null;
    return polygonOuterRing(inset.geometry as Polygon | MultiPolygon);
  } catch {
    return null;
  }
}

export function areaSqFt(ring: Ring) {
  const poly = ringToPolygon(ring);
  if (!poly) return 0;
  return area(poly) * 10.76391041671;
}

export function rectangleAround(center: LngLat, widthM: number, depthM: number, headingDeg = 0): Ring {
  const [lng, lat] = center;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((lat * Math.PI) / 180);
  const rad = (headingDeg * Math.PI) / 180;
  const hx = widthM / 2;
  const hy = depthM / 2;
  const corners: LngLat[] = [
    [-hx, -hy],
    [hx, -hy],
    [hx, hy],
    [-hx, hy],
  ].map(([x, y]) => {
    const rx = x * Math.cos(rad) - y * Math.sin(rad);
    const ry = x * Math.sin(rad) + y * Math.cos(rad);
    return [lng + rx / metersPerDegLng, lat + ry / metersPerDegLat];
  });
  return closeRing(corners);
}

export function lngLatToLocalMeters(lng: number, lat: number, origin: LngLat): [number, number] {
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((origin[1] * Math.PI) / 180);
  return [(lng - origin[0]) * metersPerDegLng, (lat - origin[1]) * metersPerDegLat];
}

export function draftLine(points: LngLat[]) {
  if (points.length < 2) return null;
  return lineString(points as Position[]);
}

export function toFeatureCollection(features: SiteFeature[], setback: Ring | null): FeatureCollection {
  const out: Feature[] = features.map((feature) => ({
    type: "Feature",
    id: feature.id,
    properties: { name: feature.name, kind: feature.kind },
    geometry: { type: "Polygon", coordinates: [closeRing(feature.ring)] },
  }));
  if (setback && setback.length >= 4) {
    out.push({
      type: "Feature",
      id: "setback",
      properties: { name: "Setback", kind: "setback", offsetFt: SETBACK_FT },
      geometry: { type: "Polygon", coordinates: [closeRing(setback)] },
    });
  }
  return { type: "FeatureCollection", features: out };
}
