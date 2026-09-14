import type { SiteFeature } from "./types";

export const DESIGN_DRAFT_KEY = "geodraftly-design-draft";

export type DesignSnapshot = {
  version: 1;
  projectId: string | null;
  name: string;
  features: SiteFeature[];
  setbackFt: number;
  padHeightFt: number;
  parkingRatio: number;
  sourceName: string | null;
  savedAt: string;
};

export function loadDraft(): DesignSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DESIGN_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DesignSnapshot;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.features)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDraft(snapshot: DesignSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DESIGN_DRAFT_KEY, JSON.stringify(snapshot));
  } catch {
    // City extracts are too large for localStorage; keep the live scene only.
  }
}
