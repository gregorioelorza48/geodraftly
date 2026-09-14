import { closeRing, lngLatToLocalMeters } from "./geo";
import type { LngLat, Ring, SiteFeature } from "./types";

const LAYERS: Record<string, { name: string; color: number }> = {
  parcel: { name: "SITE_BOUNDARY", color: 4 },
  setback: { name: "SETBACK", color: 2 },
  pad: { name: "BUILDING_PAD", color: 7 },
  parking: { name: "PARKING", color: 8 },
};

function lwpolyline(layer: string, ring: Ring, origin: LngLat) {
  const closed = closeRing(ring);
  const verts = closed.slice(0, -1).map(([lng, lat]) => lngLatToLocalMeters(lng, lat, origin));
  const lines = [
    "0",
    "LWPOLYLINE",
    "8",
    layer,
    "90",
    String(verts.length),
    "70",
    "1",
  ];
  for (const [x, y] of verts) {
    lines.push("10", x.toFixed(4), "20", y.toFixed(4));
  }
  return lines;
}

export function serializeDxf(features: SiteFeature[], setback: Ring | null) {
  const origin =
    features.find((f) => f.kind === "parcel")?.ring[0] ??
    features[0]?.ring[0] ??
    ([0, 0] as LngLat);

  const entities: string[] = [];
  for (const feature of features) {
    const layer = LAYERS[feature.kind] ?? LAYERS.parcel;
    entities.push(...lwpolyline(layer.name, feature.ring, origin));
  }
  if (setback) entities.push(...lwpolyline(LAYERS.setback.name, setback, origin));

  return [
    "0",
    "SECTION",
    "2",
    "HEADER",
    "9",
    "$INSUNITS",
    "70",
    "6",
    "0",
    "ENDSEC",
    "0",
    "SECTION",
    "2",
    "TABLES",
    "0",
    "TABLE",
    "2",
    "LAYER",
    ...Object.values(LAYERS).flatMap((layer) => ["0", "LAYER", "2", layer.name, "70", "0", "62", String(layer.color)]),
    "0",
    "ENDTAB",
    "0",
    "ENDSEC",
    "0",
    "SECTION",
    "2",
    "ENTITIES",
    ...entities,
    "0",
    "ENDSEC",
    "0",
    "EOF",
    "",
  ].join("\r\n");
}
