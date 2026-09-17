"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadDraft, writeDraft, type DesignSnapshot } from "./persist";
import { areaSqFt, featureCenter, insetRing, rectangleAround, translateRing } from "./geo";
import { computeMetrics } from "./metrics";
import type { ShapefileImport } from "./shapefile";
import {
  DEFAULT_PAD_HEIGHT_FT,
  DEFAULT_PARKING_RATIO,
  SETBACK_FT,
  type DesignProject,
  type DesignTool,
  type LngLat,
  type OverlayLayer,
  type Ring,
  type SiteFeature,
} from "./types";

function uid() {
  return crypto.randomUUID();
}

type DesignContextValue = {
  projects: DesignProject[];
  project: DesignProject | null;
  setProjectId: (id: string) => void;
  tool: DesignTool;
  setTool: (tool: DesignTool) => void;
  features: SiteFeature[];
  selectedId: string | null;
  select: (id: string | null) => void;
  setbackFt: number;
  setSetbackFt: (ft: number) => void;
  setback: Ring | null;
  padHeightFt: number;
  setPadHeightFt: (ft: number) => void;
  parkingRatio: number;
  setParkingRatio: (n: number) => void;
  draftRing: LngLat[];
  setDraftRing: (ring: LngLat[]) => void;
  cursor: LngLat | null;
  setCursor: (lngLat: LngLat | null) => void;
  inspectorOpen: boolean;
  setInspectorOpen: (open: boolean) => void;
  sourceName: string | null;
  overlays: OverlayLayer[];
  importing: string | null;
  setImporting: (message: string | null) => void;
  error: string | null;
  setError: (message: string | null) => void;
  metrics: ReturnType<typeof computeMetrics>;
  addDraftVertex: (lngLat: LngLat) => void;
  closeDraft: () => void;
  cancelDraft: () => void;
  placePad: (center: LngLat) => void;
  placeParking: (center: LngLat) => void;
  setFeatureRing: (id: string, ring: Ring) => void;
  addMark: (path: LngLat[]) => void;
  pushHistory: () => void;
  deleteSelected: () => void;
  undo: () => void;
  canUndo: boolean;
  importSite: (parsed: ShapefileImport) => void;
  applySetbackTool: () => void;
  seedDefaultSite: (center: LngLat) => void;
  goToLocation: (center: LngLat) => void;
  viewTarget: { center: LngLat; nonce: number } | null;
  captureSnapshot: () => DesignSnapshot;
  applySnapshot: (snapshot: DesignSnapshot) => void;
};

const DesignContext = createContext<DesignContextValue | null>(null);

export function DesignProvider({
  projects,
  children,
}: {
  projects: DesignProject[];
  children: ReactNode;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [tool, setTool] = useState<DesignTool>("select");
  const [features, setFeatures] = useState<SiteFeature[]>([]);
  const [selectedId, select] = useState<string | null>(null);
  const [setbackFt, setSetbackFt] = useState(SETBACK_FT);
  const [padHeightFt, setPadHeightFt] = useState(DEFAULT_PAD_HEIGHT_FT);
  const [parkingRatio, setParkingRatio] = useState(DEFAULT_PARKING_RATIO);
  const [draftRing, setDraftRing] = useState<LngLat[]>([]);
  const [cursor, setCursor] = useState<LngLat | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [overlays, setOverlays] = useState<OverlayLayer[]>([]);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [past, setPast] = useState<SiteFeature[][]>([]);
  const [viewTarget, setViewTarget] = useState<{ center: LngLat; nonce: number } | null>(null);

  const project = projects.find((p) => p.id === projectId) ?? projects[0] ?? null;

  function remember(current: SiteFeature[]) {
    setPast((history) => [...history.slice(-29), current.map((feature) => ({ ...feature, ring: [...feature.ring] }))]);
  }

  function captureSnapshot(): DesignSnapshot {
    return {
      version: 1,
      projectId: project?.id ?? null,
      name: project?.name ?? "Untitled site",
      features,
      setbackFt,
      padHeightFt,
      parkingRatio,
      sourceName,
      savedAt: new Date().toISOString(),
    };
  }

  function applySnapshot(snapshot: DesignSnapshot) {
    setFeatures(snapshot.features);
    setSetbackFt(snapshot.setbackFt);
    setPadHeightFt(snapshot.padHeightFt);
    setParkingRatio(snapshot.parkingRatio);
    setSourceName(snapshot.sourceName);
    setOverlays([]);
    if (snapshot.projectId) setProjectId(snapshot.projectId);
    select(snapshot.features[0]?.id ?? null);
  }

  useEffect(() => {
    const draft = loadDraft();
    if (draft?.features.length) {
      applySnapshot(draft);
      setReady(true);
      return;
    }
    if (!project?.latitude || !project.longitude) {
      setReady(true);
      return;
    }
    const center: LngLat = [project.longitude, project.latitude];
    const ring = rectangleAround(center, 110, 85);
    const padRing = insetRing(ring, SETBACK_FT + 10) ?? ring;
    const parking = rectangleAround([center[0] + 0.00055, center[1] - 0.00028], 48, 20);
    const nextParcel: SiteFeature = { id: uid(), kind: "parcel", name: "Concept parcel", ring };
    setFeatures([
      nextParcel,
      { id: uid(), kind: "pad", name: "Building pad", ring: padRing },
      { id: uid(), kind: "parking", name: "Parking lot", ring: parking },
    ]);
    select(nextParcel.id);
    setSourceName(null);
    setReady(true);
    // Seed / restore once per workbench mount so auth UI never rebuilds the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeDraft(captureSnapshot());
  }, [ready, features, setbackFt, padHeightFt, parkingRatio, sourceName, project?.id, project?.name]);

  const parcel = features.find((f) => f.kind === "parcel") ?? null;
  const setback = useMemo(() => {
    if (!parcel) return null;
    if (areaSqFt(parcel.ring) / 43560 >= 80) return null;
    return insetRing(parcel.ring, setbackFt);
  }, [parcel, setbackFt]);
  const metrics = useMemo(
    () => computeMetrics(features, setback, padHeightFt, parkingRatio),
    [features, setback, padHeightFt, parkingRatio],
  );

  const value: DesignContextValue = {
    projects,
    project,
    setProjectId,
    tool,
    setTool,
    features,
    selectedId,
    select,
    setbackFt,
    setSetbackFt,
    setback,
    padHeightFt,
    setPadHeightFt,
    parkingRatio,
    setParkingRatio,
    draftRing,
    setDraftRing,
    cursor,
    setCursor,
    inspectorOpen,
    setInspectorOpen,
    sourceName,
    overlays,
    importing,
    setImporting,
    error,
    setError,
    metrics,
    viewTarget,
    canUndo: past.length > 0,
    addDraftVertex(lngLat) {
      setDraftRing((current) => [...current, lngLat]);
    },
    closeDraft() {
      if (tool !== "polygon") {
        setDraftRing([]);
        return;
      }
      setDraftRing((current) => {
        if (current.length === 0) return current;
        if (current.length < 3) {
          setError("Need at least three vertices to close a site boundary.");
          return current;
        }
        const ring = [...current, current[0]] as Ring;
        const next: SiteFeature = {
          id: uid(),
          kind: "parcel",
          name: "Site boundary",
          ring,
        };
        setFeatures((existing) => {
          remember(existing);
          if (next.kind === "parcel") {
            const withoutParcel = existing.filter((f) => f.kind !== "parcel");
            const pad = setback
              ? {
                  id: uid(),
                  kind: "pad" as const,
                  name: "Building pad",
                  ring: insetRing(ring, setbackFt + 10) ?? ring,
                }
              : {
                  id: uid(),
                  kind: "pad" as const,
                  name: "Building pad",
                  ring: insetRing(ring, setbackFt + 10) ?? ring,
                };
            return [...withoutParcel.filter((f) => f.kind !== "pad"), next, pad];
          }
          return [...existing, next];
        });
        select(next.id);
        setTool("select");
        setError(null);
        return [];
      });
    },
    cancelDraft() {
      setDraftRing([]);
    },
    placePad(center) {
      const footprint = setback ? insetRing(setback, 8) : rectangleAround(center, 40, 28);
      if (!footprint) {
        setError("Import or draw a site boundary before placing a pad.");
        return;
      }
      const pad: SiteFeature = { id: uid(), kind: "pad", name: "Building pad", ring: footprint };
      setFeatures((existing) => {
        remember(existing);
        return [...existing.filter((f) => f.kind !== "pad"), pad];
      });
      select(pad.id);
      setTool("select");
    },
    placeParking(center) {
      const lot: SiteFeature = {
        id: uid(),
        kind: "parking",
        name: "Parking lot",
        ring: rectangleAround(center, 42, 18),
      };
      setFeatures((existing) => {
        remember(existing);
        return [...existing, lot];
      });
      select(lot.id);
      setTool("select");
    },
    setFeatureRing(id, ring) {
      setFeatures((existing) => existing.map((feature) => (feature.id === id ? { ...feature, ring } : feature)));
    },
    addMark(path) {
      if (!path.length) return;
      const ring = path.length === 1 ? [path[0], path[0]] : path;
      const mark: SiteFeature = {
        id: uid(),
        kind: "mark",
        name: path.length <= 2 ? "Mark" : "Sketch",
        ring,
      };
      setFeatures((existing) => {
        remember(existing);
        return [...existing, mark];
      });
      select(mark.id);
      setError(null);
    },
    pushHistory() {
      setFeatures((existing) => {
        remember(existing);
        return existing;
      });
    },
    deleteSelected() {
      if (!selectedId) {
        setError("Select a parking lot, building pad, parcel, or sketch first.");
        return;
      }
      setFeatures((existing) => {
        remember(existing);
        return existing.filter((feature) => feature.id !== selectedId);
      });
      select(null);
      setError(null);
    },
    undo() {
      const previous = past[past.length - 1];
      if (!previous) return;
      setPast((history) => history.slice(0, -1));
      setFeatures(previous);
      select(previous[previous.length - 1]?.id ?? null);
      setError(null);
    },
    importSite(parsed) {
      const parcels = parsed.parcels.map((parcel, index) => ({
        id: uid(),
        kind: "parcel" as const,
        name: parcel.name || (parsed.parcels.length > 1 ? `Parcel ${index + 1}` : "Imported parcel"),
        ring: parcel.ring,
      }));
      const primary = parcels[0];
      const next: SiteFeature[] = [...parcels];
      if (!parsed.cityScale) {
        next.push({
          id: uid(),
          kind: "pad",
          name: "Building pad",
          ring: insetRing(primary.ring, setbackFt + 10) ?? primary.ring,
        });
      }
      setFeatures(next);
      setOverlays(parsed.overlays);
      select(primary.id);
      setSourceName(parsed.name);
      setError(null);
      setTool("select");
    },
    applySetbackTool() {
      if (!parcel) {
        setError("Draw or import a site boundary first.");
        return;
      }
      setSetbackFt(SETBACK_FT);
      setTool("select");
    },
    seedDefaultSite(center) {
      const ring = rectangleAround(center, 110, 85);
      const padRing = insetRing(ring, SETBACK_FT + 10) ?? ring;
      const parking = rectangleAround([center[0] + 0.00055, center[1] - 0.00028], 48, 20);
      const nextParcel: SiteFeature = { id: uid(), kind: "parcel", name: "Concept parcel", ring };
      const pad: SiteFeature = { id: uid(), kind: "pad", name: "Building pad", ring: padRing };
      const lot: SiteFeature = { id: uid(), kind: "parking", name: "Parking lot", ring: parking };
      setFeatures([nextParcel, pad, lot]);
      setOverlays([]);
      select(nextParcel.id);
    },
    goToLocation(center) {
      setError(null);
      if (!sourceName) {
        setFeatures((existing) => {
          const from = featureCenter(existing);
          if (!from || existing.length === 0) return existing;
          const dLng = center[0] - from[0];
          const dLat = center[1] - from[1];
          if (Math.hypot(dLng, dLat) < 1e-9) return existing;
          remember(existing);
          return existing.map((feature) => ({ ...feature, ring: translateRing(feature.ring, dLng, dLat) }));
        });
      }
      setViewTarget({ center, nonce: Date.now() });
    },
    captureSnapshot,
    applySnapshot,
  };

  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>;
}

export function useDesign() {
  const ctx = useContext(DesignContext);
  if (!ctx) throw new Error("useDesign must be used inside DesignProvider");
  return ctx;
}
