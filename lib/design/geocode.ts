import type { LngLat } from "./types";

export type GeocodeHit = {
  center: LngLat;
  label: string;
};

const PAIR = /^\s*([+-]?\d+(?:\.\d+)?)\s*[,;\s]\s*([+-]?\d+(?:\.\d+)?)\s*$/;

function isLat(value: number) {
  return Number.isFinite(value) && Math.abs(value) <= 90;
}

function isLng(value: number) {
  return Number.isFinite(value) && Math.abs(value) <= 180;
}

/** Parse "32.62, -96.77" or "-96.77, 32.62". Returns [lng, lat]. */
export function parseCoordinates(query: string): GeocodeHit | null {
  const match = PAIR.exec(query.trim());
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (!isLng(a) && !isLng(b)) return null;

  let lat: number;
  let lng: number;
  if (isLat(a) && isLng(b) && !isLat(b)) {
    lat = a;
    lng = b;
  } else if (isLng(a) && isLat(b) && !isLat(a)) {
    lng = a;
    lat = b;
  } else if (isLat(a) && isLat(b)) {
    lat = a;
    lng = b;
  } else {
    return null;
  }

  const label = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  return { center: [lng, lat], label };
}
