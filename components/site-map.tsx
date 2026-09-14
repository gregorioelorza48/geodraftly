"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { cn } from "@/lib/utils";

function makePin(color: string) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:16px;height:16px;border-radius:999px;background:${color};border:2px solid #f4f1ea;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const observationPin = makePin("#2f4a3c");
const discussionPin = makePin("#b8924a");
const surveyPin = makePin("#5a6570");
const draftPin = makePin("#22362c");

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  href?: string;
  subtitle?: string;
  kind?: "observation" | "discussion" | "survey";
};

function pinFor(kind?: MapPoint["kind"]) {
  if (kind === "discussion") return discussionPin;
  if (kind === "survey") return surveyPin;
  return observationPin;
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
    // only on first mount / explicit center change from parent identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);
  return null;
}

function ClickCapture({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick?.(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

type Basemap = "map" | "satellite";
const BASEMAP_KEY = "geodraftly-map-basemap";

function useBasemap() {
  const [basemap, setBasemap] = useState<Basemap>("map");

  useEffect(() => {
    const saved = window.localStorage.getItem(BASEMAP_KEY);
    if (saved === "map" || saved === "satellite") setBasemap(saved);
  }, []);

  function choose(next: Basemap) {
    setBasemap(next);
    window.localStorage.setItem(BASEMAP_KEY, next);
  }

  return [basemap, choose] as const;
}

function tilesFor(basemap: Basemap, token?: string) {
  if (token) {
    const style = basemap === "satellite" ? "satellite-streets-v12" : "light-v11";
    return {
      url: `https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/{z}/{x}/{y}?access_token=${token}`,
      attribution:
        basemap === "satellite" ? "© Mapbox © OpenStreetMap © Maxar" : "© Mapbox © OpenStreetMap",
    };
  }
  if (basemap === "satellite") {
    return {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
    };
  }
  return {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap",
  };
}

export function SiteMap({
  points,
  center,
  onPick,
  className,
  draft,
}: {
  points: MapPoint[];
  center?: [number, number];
  onPick?: (lat: number, lng: number) => void;
  className?: string;
  draft?: { lat: number; lng: number } | null;
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [basemap, setBasemap] = useBasemap();
  const fallback = useMemo<[number, number]>(() => {
    if (center) return center;
    if (points[0]) return [points[0].lat, points[0].lng];
    if (draft) return [draft.lat, draft.lng];
    return [41.85, -87.65];
  }, [center, points, draft]);

  const tiles = tilesFor(basemap, token);

  return (
    <div className={cn("relative", className ?? "h-[420px] overflow-hidden rounded-2xl border border-line")}>
      <div className="absolute right-3 top-3 z-[1000] flex overflow-hidden rounded-lg border border-line bg-white/95 shadow-sm">
        <button
          type="button"
          onClick={() => setBasemap("map")}
          className={cn(
            "h-9 px-3 text-xs font-semibold tracking-wide",
            basemap === "map" ? "bg-field text-white" : "text-ink-soft hover:bg-paper-2 hover:text-ink",
          )}
        >
          Map
        </button>
        <button
          type="button"
          onClick={() => setBasemap("satellite")}
          className={cn(
            "h-9 px-3 text-xs font-semibold tracking-wide",
            basemap === "satellite" ? "bg-field text-white" : "text-ink-soft hover:bg-paper-2 hover:text-ink",
          )}
        >
          Satellite
        </button>
      </div>
      <MapContainer center={fallback} zoom={16} className="h-full w-full" scrollWheelZoom>
        <TileLayer key={tiles.url} url={tiles.url} attribution={tiles.attribution} maxZoom={19} />
        <Recenter center={fallback} />
        {onPick ? <ClickCapture onPick={onPick} /> : null}
        {points.map((point) => (
          <Marker
            key={point.id}
            position={[point.lat, point.lng]}
            icon={pinFor(point.kind)}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{point.title}</p>
                {point.subtitle ? <p className="text-ink-soft">{point.subtitle}</p> : null}
                {point.href ? (
                  <Link href={point.href} className="text-field underline">
                    Open
                  </Link>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
        {draft ? <Marker position={[draft.lat, draft.lng]} icon={draftPin} /> : null}
      </MapContainer>
    </div>
  );
}
