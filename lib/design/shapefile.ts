import shp from "shpjs";
import { bbox } from "@turf/turf";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { areaSqFt, closeRing, polygonOuterRing } from "./geo";
import type { OverlayKind, OverlayLayer, Ring } from "./types";

type NamedCollection = FeatureCollection & { fileName?: string };

export type ShapefileImport = {
  name: string;
  parcels: Array<{ ring: Ring; name: string }>;
  overlays: OverlayLayer[];
  cityScale: boolean;
  summary: string;
};

const CITY_ACRES = 80;
const SITE_PARCEL_LIMIT = 20;
const OVERLAY_CAPS: Record<OverlayKind, number> = {
  building: 25000,
  road: 35000,
  water: 6000,
  landuse: 8000,
  rail: 8000,
  other: 4000,
};

function asCollections(data: NamedCollection | NamedCollection[]) {
  return Array.isArray(data) ? data : [data];
}

function isPoly(feature: Feature): feature is Feature<Polygon | MultiPolygon> {
  return feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon";
}

function layerName(collection: NamedCollection) {
  return (collection.fileName ?? "").replace(/^.*\//, "").toLowerCase();
}

function featureLabel(feature: Feature) {
  const props = feature.properties ?? {};
  return String(props.name ?? props.NAME ?? props.Name ?? props.fclass ?? "Imported parcel");
}

function adminLevel(feature: Feature) {
  const value = String(feature.properties?.fclass ?? feature.properties?.admin_level ?? "");
  const match = value.match(/admin_level\s*(\d+)/i) ?? value.match(/\b(\d+)\b/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function zipHint(fileName: string) {
  return fileName
    .replace(/\.zip$/i, "")
    .replace(/shapefiles?_?/i, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
}

function classify(name: string): "admin" | "places" | OverlayKind | "skip" {
  if (/adminareas|admin_a|boundary_a/.test(name)) return "admin";
  if (/places_a/.test(name)) return "places";
  if (/buildings/.test(name)) return "building";
  if (/roads|routes/.test(name)) return "road";
  if (/water_a|waterways/.test(name)) return "water";
  if (/landuse/.test(name)) return "landuse";
  if (/railways/.test(name)) return "rail";
  if (/pois|traffic|power|pofw|barriers|coastline|natural_07|places_07|nonop|runways|transport/.test(name)) {
    return "skip";
  }
  return "other";
}

function takeSpread<T>(items: T[], max: number) {
  if (items.length <= max) return items;
  const step = items.length / max;
  return Array.from({ length: max }, (_, index) => items[Math.floor(index * step)]);
}

function scoreBoundary(feature: Feature, hint: string) {
  const name = featureLabel(feature).toLowerCase();
  const level = adminLevel(feature);
  const fclass = String(feature.properties?.fclass ?? "").toLowerCase();
  let score = 0;
  if (hint && name === hint) score += 120;
  if (hint && name.includes(hint)) score += 80;
  if (fclass === "city") score += 70;
  if (level === 6) score += 50;
  if (level === 7 || level === 8) score += 28;
  if (level >= 9) score -= 20;
  if (/landkreis|kreis |county/.test(name)) score -= 50;
  return score;
}

function bboxRing(features: Feature[]): Ring | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const feature of features) {
    if (!feature.geometry) continue;
    try {
      const box = bbox(feature);
      minX = Math.min(minX, box[0]);
      minY = Math.min(minY, box[1]);
      maxX = Math.max(maxX, box[2]);
      maxY = Math.max(maxY, box[3]);
    } catch {
      // skip unreadable geometry
    }
  }
  if (!Number.isFinite(minX)) return null;
  return closeRing([
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
  ]);
}

function overlayFrom(kind: OverlayKind, name: string, features: Feature[]): OverlayLayer | null {
  const kept = takeSpread(
    features.filter((feature) => feature.geometry),
    OVERLAY_CAPS[kind],
  );
  if (!kept.length) return null;
  return {
    id: `${kind}-${name.replace(/[^a-z0-9]+/gi, "-")}`,
    name,
    kind,
    collection: { type: "FeatureCollection", features: kept },
  };
}

export async function parseShapefileZip(file: File): Promise<ShapefileImport> {
  const zipLike = file.name.toLowerCase().endsWith(".zip") || file.type.includes("zip");
  if (!zipLike) {
    throw new Error("Drop a .zip that contains .shp / .dbf / .prj. City extracts such as shapefiles_dresden.zip work.");
  }

  let parsed: NamedCollection | NamedCollection[];
  try {
    parsed = (await shp(await file.arrayBuffer())) as NamedCollection | NamedCollection[];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read that shapefile.";
    throw new Error(
      message.includes("no layers")
        ? "No shapefile layers found in that zip."
        : `Could not read that shapefile (${message}).`,
    );
  }

  const hint = zipHint(file.name);
  const adminCandidates: Feature[] = [];
  const sitePolygons: Array<{ ring: Ring; name: string; acres: number }> = [];
  const overlayBuckets: Record<OverlayKind, Feature[]> = {
    building: [],
    road: [],
    water: [],
    landuse: [],
    rail: [],
    other: [],
  };
  let layerCount = 0;

  for (const collection of asCollections(parsed)) {
    layerCount += 1;
    const name = layerName(collection);
    const kind = classify(name);
    if (kind === "skip") continue;
    for (const feature of collection.features ?? []) {
      if (!feature.geometry) continue;
      if (kind === "admin" || kind === "places") {
        adminCandidates.push(feature);
        if (isPoly(feature)) {
          const ring = polygonOuterRing(feature.geometry);
          if (ring && ring.length >= 4) {
            sitePolygons.push({ ring, name: featureLabel(feature), acres: areaSqFt(ring) / 43560 });
          }
        }
        continue;
      }
      overlayBuckets[kind].push(feature);
    }
  }

  const rankedAdmin = adminCandidates
    .filter(isPoly)
    .map((feature) => {
      const ring = polygonOuterRing(feature.geometry);
      if (!ring || ring.length < 4) return null;
      return { feature, ring, name: featureLabel(feature), score: scoreBoundary(feature, hint) };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.score - a.score || areaSqFt(b.ring) - areaSqFt(a.ring));

  let parcels: Array<{ ring: Ring; name: string }> = [];
  if (rankedAdmin[0] && rankedAdmin[0].score >= 20) {
    parcels = [{ ring: rankedAdmin[0].ring, name: rankedAdmin[0].name }];
  } else {
    const modest = sitePolygons.filter((row) => row.acres > 0.05 && row.acres < CITY_ACRES).sort((a, b) => b.acres - a.acres);
    if (modest.length && modest.length <= SITE_PARCEL_LIMIT) {
      parcels = modest.map(({ ring, name }) => ({ ring, name }));
    } else if (modest[0]) {
      parcels = [{ ring: modest[0].ring, name: modest[0].name }];
    }
  }

  if (!parcels.length) {
    const frame = bboxRing([...adminCandidates, ...overlayBuckets.building, ...overlayBuckets.landuse]);
    if (frame) parcels = [{ ring: frame, name: hint ? hint.replace(/\b\w/g, (c) => c.toUpperCase()) : "Imported extent" }];
  }

  if (!parcels.length) {
    throw new Error("No usable geometry found. The zip needs polygon or line shapefiles.");
  }

  const overlays = (Object.entries(overlayBuckets) as Array<[OverlayKind, Feature[]]>)
    .map(([kind, features]) => overlayFrom(kind, kind, features))
    .filter((layer): layer is OverlayLayer => Boolean(layer));

  const acres = parcels.reduce((sum, parcel) => sum + areaSqFt(parcel.ring) / 43560, 0);
  const cityScale = acres >= CITY_ACRES || overlayBuckets.building.length > 200;
  const overlayCount = overlays.reduce((sum, layer) => sum + layer.collection.features.length, 0);

  return {
    name: file.name,
    parcels,
    overlays,
    cityScale,
    summary: cityScale
      ? `Imported ${parcels[0]?.name ?? "city"} plus ${overlayCount.toLocaleString()} map features from ${layerCount} layers.`
      : `Imported ${parcels.length} parcel${parcels.length === 1 ? "" : "s"}.`,
  };
}
