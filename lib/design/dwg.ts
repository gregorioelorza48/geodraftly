import {
  ACadVersion,
  CadDocument,
  Color,
  DwgWriter,
  Layer,
  LwPolyline,
  LwPolylineVertex,
  MeasurementUnits,
  UnitsType,
  XY,
} from "@node-projects/acad-ts";
import { CAD_LAYERS, layoutPolylines } from "./cad-layout";
import type { Ring, SiteFeature } from "./types";

function ensureLayer(doc: CadDocument, name: string, color: number) {
  const layers = doc.layers;
  if (!layers) throw new Error("DWG document is missing a layer table.");
  if (layers.contains(name)) return layers.get(name);
  const layer = new Layer(name);
  layer.color = new Color(color);
  layers.add(layer);
  return layer;
}

/** AutoCAD 2004 DWG (AC1018). Civil 3D and current AutoCAD open this natively. */
export function serializeDwg(features: SiteFeature[], setback: Ring | null): Uint8Array {
  const doc = new CadDocument(ACadVersion.AC1018);
  if (!doc.header || !doc.modelSpace || !doc.layers) {
    throw new Error("Could not create a DWG document.");
  }

  doc.header.insUnits = UnitsType.Meters;
  doc.header.measurementUnits = MeasurementUnits.Metric;
  if (doc.summaryInfo) {
    doc.summaryInfo.title = "Geodraftly site layout";
    doc.summaryInfo.author = "Geodraftly";
  }

  for (const layer of Object.values(CAD_LAYERS)) {
    ensureLayer(doc, layer.name, layer.color);
  }

  for (const polyline of layoutPolylines(features, setback)) {
    const layer = ensureLayer(doc, polyline.layer, polyline.color);
    const lw = new LwPolyline(polyline.vertices.map(([x, y]) => new LwPolylineVertex(new XY(x, y))));
    lw.isClosed = true;
    lw.layer = layer;
    doc.modelSpace.entities.add(lw);
  }

  return DwgWriter.writeToBuffer(doc);
}
