import {
  DEFAULT_PARKING_RATIO,
  FT_PER_FLOOR,
  SF_PER_STALL,
  type LngLat,
  type Ring,
  type SiteFeature,
  type SpatialMetrics,
} from "./types";
import { areaSqFt, closeRing, featureCenter, lngLatToLocalMeters } from "./geo";

export type ParkingSpecs = {
  areaSqFt: number;
  acres: number;
  widthFt: number;
  depthFt: number;
  perimeterFt: number;
  stalls: number;
  sfPerStall: number;
  center: LngLat | null;
};

export function computeMetrics(
  features: SiteFeature[],
  setback: Ring | null,
  padHeightFt: number,
  parkingRatio = DEFAULT_PARKING_RATIO,
): SpatialMetrics {
  const parcels = features.filter((f) => f.kind === "parcel");
  const pads = features.filter((f) => f.kind === "pad");
  const lots = features.filter((f) => f.kind === "parking");

  const parcelSqFt = parcels.reduce((sum, f) => sum + areaSqFt(f.ring), 0);
  const buildableSqFt = setback ? areaSqFt(setback) : 0;
  const padSqFt = pads.reduce((sum, f) => sum + areaSqFt(f.ring), 0);
  const parkingSqFt = lots.reduce((sum, f) => sum + areaSqFt(f.ring), 0);
  const floors = Math.max(1, Math.round(padHeightFt / FT_PER_FLOOR));
  const gfa = padSqFt * floors;

  return {
    parcelSqFt,
    parcelAcres: parcelSqFt / 43560,
    buildableSqFt,
    buildableAcres: buildableSqFt / 43560,
    padSqFt,
    parkingSqFt,
    targetStalls: Math.round((gfa / 1000) * parkingRatio),
    calculatedStalls: Math.floor(parkingSqFt / SF_PER_STALL),
    cutFillCy: Math.round((parcelSqFt * 1.5) / 27),
  };
}

export function formatArea(sqFt: number) {
  if (sqFt <= 0) return "—";
  return `${Math.round(sqFt).toLocaleString()} sf`;
}

export function formatAcres(acres: number) {
  if (acres <= 0) return "—";
  return `${acres.toFixed(2)} ac`;
}

export function formatFeet(feet: number) {
  if (feet <= 0) return "—";
  return `${Math.round(feet).toLocaleString()} ft`;
}

export function parkingSpecs(ring: Ring): ParkingSpecs {
  const closed = closeRing(ring);
  const origin = closed[0];
  const edges: number[] = [];
  if (origin) {
    const pts = closed.map(([lng, lat]) => lngLatToLocalMeters(lng, lat, origin));
    for (let index = 0; index < pts.length - 1; index += 1) {
      const dx = pts[index + 1][0] - pts[index][0];
      const dy = pts[index + 1][1] - pts[index][1];
      edges.push(Math.hypot(dx, dy));
    }
  }
  const widthM = edges[0] ?? 0;
  const depthM = edges[1] ?? 0;
  const area = areaSqFt(ring);
  return {
    areaSqFt: area,
    acres: area / 43560,
    widthFt: widthM * 3.280839895,
    depthFt: depthM * 3.280839895,
    perimeterFt: edges.reduce((sum, meters) => sum + meters, 0) * 3.280839895,
    stalls: Math.floor(area / SF_PER_STALL),
    sfPerStall: SF_PER_STALL,
    center: featureCenter([{ id: "lot", kind: "parking", name: "lot", ring }]),
  };
}
