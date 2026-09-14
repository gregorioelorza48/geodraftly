export type InterchangePoint = {
  pointNumber: string;
  latitude: number;
  longitude: number;
  elevation: number | null;
  description: string;
  category: string;
  source: string;
  recordedAt: string | null;
  geodraftlyId: string;
};

const LAT_KEYS = ["latitude", "lat", "y"];
const LNG_KEYS = ["longitude", "lon", "lng", "long", "x"];
const NE_KEYS = ["northing", "easting", "n", "e"];
const ELEV_KEYS = ["elevation", "elev", "z"];
const DESC_KEYS = ["description", "desc", "code", "raw", "title", "comment"];
const NUM_KEYS = ["point", "point_number", "pointnumber", "number", "pt", "name", "id", "geodraftly_id"];
const CAT_KEYS = ["category", "kind", "source"];

function norm(header: string) {
  return header.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function pick(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    if (row[key] != null && row[key] !== "") return row[key];
  }
  return "";
}

function parseNumber(value: string) {
  const n = Number(value.replace(/[,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function isGeographic(lat: number, lng: number) {
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export function looksProjected(values: number[]) {
  return values.some((v) => Math.abs(v) > 180);
}

export function serializeCsv(points: InterchangePoint[]) {
  const header = [
    "Point",
    "Latitude",
    "Longitude",
    "Elevation",
    "Description",
    "Category",
    "Source",
    "RecordedAt",
    "GeodraftlyId",
  ];
  const lines = [header.join(",")];
  for (const point of points) {
    lines.push(
      [
        csvCell(point.pointNumber),
        csvCell(point.latitude.toFixed(8)),
        csvCell(point.longitude.toFixed(8)),
        csvCell(point.elevation == null ? "" : String(point.elevation)),
        csvCell(point.description),
        csvCell(point.category),
        csvCell(point.source),
        csvCell(point.recordedAt ?? ""),
        csvCell(point.geodraftlyId),
      ].join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}

function csvCell(value: string) {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function serializeGeoJson(points: InterchangePoint[], projectName: string) {
  return JSON.stringify(
    {
      type: "FeatureCollection",
      name: projectName,
      crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
      features: points.map((point) => ({
        type: "Feature",
        id: point.geodraftlyId,
        geometry: {
          type: "Point",
          coordinates: [point.longitude, point.latitude, point.elevation ?? 0],
        },
        properties: {
          Point: point.pointNumber,
          Description: point.description,
          Category: point.category,
          Source: point.source,
          Elevation: point.elevation,
          RecordedAt: point.recordedAt,
          GeodraftlyId: point.geodraftlyId,
        },
      })),
    },
    null,
    2,
  );
}

export function parseCsv(text: string): InterchangePoint[] {
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error("CSV needs a header row and at least one point.");
  const headers = rows[0].map(norm);
  const points: InterchangePoint[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    if (rows[i].every((cell) => cell.trim() === "")) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = rows[i][idx] ?? "";
    });
    if (NE_KEYS.some((k) => row[k]) && !LAT_KEYS.some((k) => row[k]) && !LNG_KEYS.some((k) => row[k])) {
      throw new Error(
        "This CSV looks like Civil 3D northing/easting (PNEZD). Re-export as latitude/longitude (WGS84 / LL84), or use GeoJSON in geographic coordinates.",
      );
    }
    const lat = parseNumber(pick(row, LAT_KEYS));
    const lng = parseNumber(pick(row, LNG_KEYS));
    if (lat == null || lng == null) {
      throw new Error(`Row ${i + 1} is missing Latitude/Longitude.`);
    }
    if (!isGeographic(lat, lng) || looksProjected([lat, lng])) {
      throw new Error(
        `Row ${i + 1} is not WGS84 latitude/longitude. Civil 3D should export LL84, or assign a lat/long point file format.`,
      );
    }
    points.push({
      pointNumber: pick(row, NUM_KEYS) || String(i),
      latitude: lat,
      longitude: lng,
      elevation: parseNumber(pick(row, ELEV_KEYS)),
      description: pick(row, DESC_KEYS),
      category: pick(row, CAT_KEYS) || "CIVIL3D",
      source: "import",
      recordedAt: null,
      geodraftlyId: "",
    });
  }
  return points;
}

export function parseGeoJson(text: string): InterchangePoint[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  const features = collectPointFeatures(data);
  if (features.length === 0) throw new Error("No Point features found in that GeoJSON.");

  return features.map((feature, index) => {
    const coords = feature.coordinates;
    const lng = coords[0];
    const lat = coords[1];
    const elevation = coords.length > 2 ? coords[2] : null;
    if (!isGeographic(lat, lng) || looksProjected([lat, lng])) {
      throw new Error(
        "GeoJSON coordinates are not WGS84 lon/lat. In Civil 3D / Map 3D, export with LL84 (WGS84) as the target CS.",
      );
    }
    const props = feature.properties ?? {};
    const prop = (keys: string[]) => {
      for (const key of Object.keys(props)) {
        if (keys.includes(norm(key)) && props[key] != null) return String(props[key]);
      }
      return "";
    };
    return {
      pointNumber: prop(NUM_KEYS) || feature.id || String(index + 1),
      latitude: lat,
      longitude: lng,
      elevation: elevation == null ? parseNumber(prop(ELEV_KEYS)) : elevation,
      description: prop(DESC_KEYS),
      category: prop(CAT_KEYS) || "CIVIL3D",
      source: "import",
      recordedAt: null,
      geodraftlyId: prop(["geodraftly_id", "geodraftlyid"]) || "",
    };
  });
}

function collectPointFeatures(
  data: unknown,
): { coordinates: number[]; properties: Record<string, unknown> | null; id: string }[] {
  const out: { coordinates: number[]; properties: Record<string, unknown> | null; id: string }[] = [];

  const visit = (node: unknown, inherited: Record<string, unknown> | null, id: string) => {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    const type = obj.type;
    if (type === "FeatureCollection" && Array.isArray(obj.features)) {
      obj.features.forEach((f, i) => visit(f, inherited, `${id}-${i}`));
      return;
    }
    if (type === "Feature") {
      visit(obj.geometry, (obj.properties as Record<string, unknown>) ?? null, String(obj.id ?? id));
      return;
    }
    if (type === "Point" && Array.isArray(obj.coordinates)) {
      const coordinates = (obj.coordinates as unknown[]).map(Number);
      if (coordinates.length >= 2) out.push({ coordinates, properties: inherited, id });
      return;
    }
    if (type === "MultiPoint" && Array.isArray(obj.coordinates)) {
      (obj.coordinates as unknown[]).forEach((c, i) => {
        if (Array.isArray(c) && c.length >= 2) {
          out.push({ coordinates: c.map(Number), properties: inherited, id: `${id}-${i}` });
        }
      });
    }
  };

  visit(data, null, "pt");
  return out;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}
