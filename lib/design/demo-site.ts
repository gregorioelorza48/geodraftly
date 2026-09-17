import type { LngLat } from "./types";

/** Default demo site: 2625 N Dallas Avenue, Dallas, TX (Lancaster / Dallas County). */
export const DEMO_SITE = {
  address: "2625 N Dallas Avenue",
  city: "Dallas",
  state: "TX",
  postalCode: "75134",
  latitude: 32.618581,
  longitude: -96.767542,
} as const;

export const DEMO_SITE_CENTER: LngLat = [DEMO_SITE.longitude, DEMO_SITE.latitude];

export function offsetFromDemoSite(northMeters: number, eastMeters: number) {
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((DEMO_SITE.latitude * Math.PI) / 180);
  return {
    latitude: DEMO_SITE.latitude + northMeters / metersPerDegLat,
    longitude: DEMO_SITE.longitude + eastMeters / metersPerDegLng,
  };
}
