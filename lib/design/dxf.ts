import { CAD_LAYERS, layoutPolylines } from "./cad-layout";
import type { Ring, SiteFeature } from "./types";

function lwpolyline(layer: string, vertices: [number, number][]) {
  const lines = ["0", "LWPOLYLINE", "8", layer, "90", String(vertices.length), "70", "1"];
  for (const [x, y] of vertices) {
    lines.push("10", x.toFixed(4), "20", y.toFixed(4));
  }
  return lines;
}

export function serializeDxf(features: SiteFeature[], setback: Ring | null) {
  const entities = layoutPolylines(features, setback).flatMap((polyline) =>
    lwpolyline(polyline.layer, polyline.vertices),
  );

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
    ...Object.values(CAD_LAYERS).flatMap((layer) => ["0", "LAYER", "2", layer.name, "70", "0", "62", String(layer.color)]),
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
