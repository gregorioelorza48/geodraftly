"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "@/components/site-map";

const SiteMap = dynamic(() => import("@/components/site-map").then((m) => m.SiteMap), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-ink-soft">Loading map…</div>,
});

export function SiteMapLoader({
  points,
  center,
  className,
  onPick,
  draft,
}: {
  points: MapPoint[];
  center?: [number, number];
  className?: string;
  onPick?: (lat: number, lng: number) => void;
  draft?: { lat: number; lng: number } | null;
}) {
  return <SiteMap points={points} center={center} className={className} onPick={onPick} draft={draft} />;
}
