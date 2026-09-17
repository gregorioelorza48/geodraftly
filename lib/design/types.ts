export type DesignTool = "select" | "pencil" | "pan" | "polygon" | "pad" | "parking" | "setback";

export type LngLat = [number, number];
export type Ring = LngLat[];

export type SiteKind = "parcel" | "pad" | "parking" | "mark";

export type OverlayKind = "building" | "road" | "water" | "landuse" | "rail" | "other";

export type OverlayLayer = {
  id: string;
  name: string;
  kind: OverlayKind;
  collection: import("geojson").FeatureCollection;
};

export type SiteFeature = {
  id: string;
  kind: SiteKind;
  name: string;
  ring: Ring;
};

export type DesignProject = {
  id: string;
  name: string;
  number: string;
  latitude: number | null;
  longitude: number | null;
};

export type SpatialMetrics = {
  parcelSqFt: number;
  parcelAcres: number;
  buildableSqFt: number;
  buildableAcres: number;
  padSqFt: number;
  parkingSqFt: number;
  targetStalls: number;
  calculatedStalls: number;
  cutFillCy: number;
};

export const SETBACK_FT = 15;
export const DEFAULT_PAD_HEIGHT_FT = 28;
export const DEFAULT_PARKING_RATIO = 4;
export const SF_PER_STALL = 350;
export const FT_PER_FLOOR = 12;
