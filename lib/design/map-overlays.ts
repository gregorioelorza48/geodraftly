import type { Feature, FeatureCollection } from "geojson";
import type maplibregl from "maplibre-gl";
import { closeRing } from "./geo";
import type { LngLat, OverlayKind, OverlayLayer, SiteFeature } from "./types";

const PREFIX = "geodraftly-import-";
const OBJECT_SRC = "geodraftly-object-src";
const OBJECT_FILL = "geodraftly-object-fill";
const OBJECT_EXTRUDE = "geodraftly-object-extrude";
const OBJECT_GLOW = "geodraftly-object-glow";
const OBJECT_LINE = "geodraftly-object-line";
const MARK_SRC = "geodraftly-mark-src";
const MARK_GLOW = "geodraftly-mark-glow";
const MARK_LINE = "geodraftly-mark-line";
const MARK_POINT = "geodraftly-mark-point";
const THREE_LAYER = "geodraftly-3d";

const FILL: Record<OverlayKind, { color: string; opacity: number; line: string }> = {
  building: { color: "#cbd5e1", opacity: 0.55, line: "#f8fafc" },
  road: { color: "#e2e8f0", opacity: 0.9, line: "#e2e8f0" },
  water: { color: "#38bdf8", opacity: 0.42, line: "#7dd3fc" },
  landuse: { color: "#4ade80", opacity: 0.16, line: "#86efac" },
  rail: { color: "#fbbf24", opacity: 0.85, line: "#fbbf24" },
  other: { color: "#a1a1aa", opacity: 0.35, line: "#d4d4d8" },
};

function mode(collection: FeatureCollection): "fill" | "line" | "circle" {
  const type = collection.features[0]?.geometry?.type ?? "";
  if (type === "Point" || type === "MultiPoint") return "circle";
  if (type === "LineString" || type === "MultiLineString") return "line";
  return "fill";
}

export function syncImportOverlays(map: maplibregl.Map, overlays: OverlayLayer[]) {
  const style = map.getStyle();
  if (!style) return;

  for (const layer of style.layers ?? []) {
    if (layer.id.startsWith(PREFIX) && map.getLayer(layer.id)) map.removeLayer(layer.id);
  }
  for (const key of Object.keys(style.sources ?? {})) {
    if (key.startsWith(PREFIX) && map.getSource(key)) map.removeSource(key);
  }

  const before = map.getLayer(OBJECT_EXTRUDE)
    ? OBJECT_EXTRUDE
    : map.getLayer(THREE_LAYER)
      ? THREE_LAYER
      : map.getLayer(OBJECT_FILL)
        ? OBJECT_FILL
        : undefined;

  for (const overlay of overlays) {
    const sourceId = `${PREFIX}${overlay.id}`;
    const paint = FILL[overlay.kind];
    map.addSource(sourceId, { type: "geojson", data: overlay.collection });
    const draw = mode(overlay.collection);
    if (draw === "fill") {
      map.addLayer(
        {
          id: `${sourceId}-fill`,
          type: "fill",
          source: sourceId,
          paint: { "fill-color": paint.color, "fill-opacity": paint.opacity },
        },
        before,
      );
      map.addLayer(
        {
          id: `${sourceId}-line`,
          type: "line",
          source: sourceId,
          paint: { "line-color": paint.line, "line-width": 0.6, "line-opacity": 0.7 },
        },
        before,
      );
    } else if (draw === "line") {
      map.addLayer(
        {
          id: `${sourceId}-line`,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": paint.line,
            "line-width": overlay.kind === "road" ? 1.15 : 1.4,
            "line-opacity": overlay.kind === "road" ? 0.7 : 0.85,
          },
        },
        before,
      );
    } else {
      map.addLayer(
        {
          id: `${sourceId}-circle`,
          type: "circle",
          source: sourceId,
          paint: { "circle-color": paint.color, "circle-radius": 3, "circle-opacity": 0.8 },
        },
        before,
      );
    }
  }

  raiseVolumeLayers(map);
}

export function syncDesignObjects(
  map: maplibregl.Map,
  features: SiteFeature[],
  selectedId: string | null,
  padHeightFt = 28,
  draftRing: LngLat[] = [],
) {
  if (map.getLayer(OBJECT_LINE)) map.removeLayer(OBJECT_LINE);
  if (map.getLayer(OBJECT_GLOW)) map.removeLayer(OBJECT_GLOW);
  if (map.getLayer(OBJECT_EXTRUDE)) map.removeLayer(OBJECT_EXTRUDE);
  if (map.getLayer(OBJECT_FILL)) map.removeLayer(OBJECT_FILL);
  if (map.getSource(OBJECT_SRC)) map.removeSource(OBJECT_SRC);
  if (map.getLayer(MARK_POINT)) map.removeLayer(MARK_POINT);
  if (map.getLayer(MARK_LINE)) map.removeLayer(MARK_LINE);
  if (map.getLayer(MARK_GLOW)) map.removeLayer(MARK_GLOW);
  if (map.getSource(MARK_SRC)) map.removeSource(MARK_SRC);

  const drawn: Feature[] = features
    .filter((feature) => feature.kind !== "mark" && feature.ring.length >= 4)
    .map((feature) => ({
      type: "Feature",
      id: feature.id,
      properties: { kind: feature.kind, selected: feature.id === selectedId ? "yes" : "no" },
      geometry: { type: "Polygon", coordinates: [closeRing(feature.ring)] },
    }));
  if (drawn.length) {
    map.addSource(OBJECT_SRC, { type: "geojson", data: { type: "FeatureCollection", features: drawn } });
    const padHeightM = Math.max(padHeightFt * 0.3048, 3);

    map.addLayer({
      id: OBJECT_FILL,
      type: "fill",
      source: OBJECT_SRC,
      filter: ["==", ["get", "kind"], "parking"],
      paint: {
        "fill-color": "#f59e0b",
        "fill-opacity": ["case", ["==", ["get", "selected"], "yes"], 0.55, 0.38],
      },
    });
    map.addLayer({
      id: OBJECT_EXTRUDE,
      type: "fill-extrusion",
      source: OBJECT_SRC,
      filter: ["any", ["==", ["get", "kind"], "pad"], ["==", ["get", "kind"], "parking"]],
      paint: {
        "fill-extrusion-color": [
          "case",
          ["==", ["get", "kind"], "parking"],
          "#f59e0b",
          ["==", ["get", "selected"], "yes"],
          "#67e8f9",
          "#94a3b8",
        ],
        "fill-extrusion-height": ["case", ["==", ["get", "kind"], "pad"], padHeightM, 0.7],
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": 0.96,
        "fill-extrusion-vertical-gradient": true,
      },
    });
    map.addLayer({
      id: OBJECT_GLOW,
      type: "line",
      source: OBJECT_SRC,
      filter: ["==", ["get", "selected"], "yes"],
      paint: {
        "line-color": ["match", ["get", "kind"], "parking", "#fde68a", "pad", "#67e8f9", "#fde68a"],
        "line-width": 10,
        "line-opacity": 0.35,
        "line-blur": 2,
      },
    });
    map.addLayer({
      id: OBJECT_LINE,
      type: "line",
      source: OBJECT_SRC,
      paint: {
        "line-color": ["match", ["get", "kind"], "parking", "#fde68a", "pad", "#a5f3fc", "parcel", "#22d3ee", "#ffffff"],
        "line-width": ["case", ["==", ["get", "selected"], "yes"], 4, 1.8],
      },
    });
  }

  const marks: Feature[] = [];
  for (const feature of features) {
    if (feature.kind !== "mark" || feature.ring.length === 0) continue;
    marks.push(markFeature(feature.id, feature.ring, feature.id === selectedId));
  }
  if (draftRing.length) marks.push(markFeature("draft", draftRing, true));

  if (marks.length) {
    map.addSource(MARK_SRC, { type: "geojson", data: { type: "FeatureCollection", features: marks } });
    map.addLayer({
      id: MARK_GLOW,
      type: "line",
      source: MARK_SRC,
      filter: ["==", ["geometry-type"], "LineString"],
      paint: {
        "line-color": "#f472b6",
        "line-width": ["case", ["==", ["get", "selected"], "yes"], 10, 7],
        "line-opacity": 0.28,
        "line-blur": 1.4,
      },
    });
    map.addLayer({
      id: MARK_LINE,
      type: "line",
      source: MARK_SRC,
      filter: ["==", ["geometry-type"], "LineString"],
      paint: {
        "line-color": ["case", ["==", ["get", "selected"], "yes"], "#fbcfe8", "#f472b6"],
        "line-width": ["case", ["==", ["get", "selected"], "yes"], 3.2, 2.2],
        "line-opacity": 0.95,
      },
    });
    map.addLayer({
      id: MARK_POINT,
      type: "circle",
      source: MARK_SRC,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-color": ["case", ["==", ["get", "selected"], "yes"], "#fbcfe8", "#f472b6"],
        "circle-radius": ["case", ["==", ["get", "selected"], "yes"], 7, 5.5],
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#fff1f2",
        "circle-opacity": 0.95,
      },
    });
  }

  raiseVolumeLayers(map);
}

function markFeature(id: string, ring: LngLat[], selected: boolean): Feature {
  const pointMark =
    ring.length < 2 || (ring.length === 2 && ring[0][0] === ring[1][0] && ring[0][1] === ring[1][1]);
  return {
    type: "Feature",
    id,
    properties: { kind: "mark", selected: selected ? "yes" : "no" },
    geometry: pointMark
      ? { type: "Point", coordinates: ring[0] }
      : { type: "LineString", coordinates: ring },
  };
}

function raiseVolumeLayers(map: maplibregl.Map) {
  if (map.getLayer(OBJECT_FILL)) map.moveLayer(OBJECT_FILL);
  if (map.getLayer(OBJECT_EXTRUDE)) map.moveLayer(OBJECT_EXTRUDE);
  if (map.getLayer(OBJECT_GLOW)) map.moveLayer(OBJECT_GLOW);
  if (map.getLayer(OBJECT_LINE)) map.moveLayer(OBJECT_LINE);
  if (map.getLayer(MARK_GLOW)) map.moveLayer(MARK_GLOW);
  if (map.getLayer(MARK_LINE)) map.moveLayer(MARK_LINE);
  if (map.getLayer(MARK_POINT)) map.moveLayer(MARK_POINT);
}
