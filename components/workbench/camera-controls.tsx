"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Minus, Plus, RotateCcw, RotateCw, View } from "lucide-react";
import type maplibregl from "maplibre-gl";
import { cn } from "@/lib/utils";

const TICK_MS = 40;
const BEARING_STEP = 0.32;
const PITCH_STEP = 0.28;
const ZOOM_STEP = 0.08;
const MIN_ZOOM = 12;
const MAX_ZOOM = 20;

export function CameraControls({ getMap }: { getMap: () => maplibregl.Map | null }) {
  const holdRef = useRef<number | null>(null);
  const [angles, setAngles] = useState({ pitch: 52, bearing: -28, zoom: 17 });

  useEffect(() => {
    const sync = () => {
      const map = getMap();
      if (!map) return;
      setAngles({ pitch: map.getPitch(), bearing: map.getBearing(), zoom: map.getZoom() });
    };
    const id = window.setInterval(sync, 200);
    sync();
    return () => {
      window.clearInterval(id);
      stopHold();
    };
  }, [getMap]);

  function stopHold() {
    if (holdRef.current != null) {
      window.clearInterval(holdRef.current);
      holdRef.current = null;
    }
  }

  function startHold(apply: (map: maplibregl.Map) => void) {
    stopHold();
    const tick = () => {
      const map = getMap();
      if (!map) return;
      apply(map);
      setAngles({ pitch: map.getPitch(), bearing: map.getBearing(), zoom: map.getZoom() });
    };
    tick();
    holdRef.current = window.setInterval(tick, TICK_MS);
  }

  function zoomBy(delta: number) {
    const map = getMap();
    if (!map) return;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, map.getZoom() + delta));
    map.setZoom(next);
    setAngles({ pitch: map.getPitch(), bearing: map.getBearing(), zoom: next });
  }

  function startZoomHold(direction: 1 | -1) {
    stopHold();
    zoomBy(direction);
    holdRef.current = window.setInterval(() => {
      const map = getMap();
      if (!map) return;
      map.setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, map.getZoom() + direction * ZOOM_STEP)));
      setAngles({ pitch: map.getPitch(), bearing: map.getBearing(), zoom: map.getZoom() });
    }, TICK_MS);
  }

  function reset() {
    const map = getMap();
    if (!map) return;
    stopHold();
    map.easeTo({ pitch: 55, bearing: -28, duration: 700 });
    setAngles({ pitch: 55, bearing: -28, zoom: map.getZoom() });
  }

  return (
    <div className="pointer-events-auto absolute bottom-4 left-3 z-20 flex items-end gap-2">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/85 p-1.5 shadow-2xl backdrop-blur-md">
        <p className="px-1 pb-1 text-center text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Camera</p>
        <div className="grid grid-cols-3 gap-1">
          <span />
          <HoldButton
            label="Tilt up"
            onHold={() =>
              startHold((map) => map.setPitch(Math.min(80, map.getPitch() + PITCH_STEP)))
            }
            onRelease={stopHold}
          >
            <ChevronUp className="h-4 w-4" />
          </HoldButton>
          <span />
          <HoldButton
            label="Rotate left"
            onHold={() => startHold((map) => map.setBearing(map.getBearing() - BEARING_STEP))}
            onRelease={stopHold}
          >
            <RotateCcw className="h-4 w-4" />
          </HoldButton>
          <button
            type="button"
            title="Reset tilt"
            onClick={reset}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <View className="h-4 w-4" />
            <span className="sr-only">Reset camera</span>
          </button>
          <HoldButton
            label="Rotate right"
            onHold={() => startHold((map) => map.setBearing(map.getBearing() + BEARING_STEP))}
            onRelease={stopHold}
          >
            <RotateCw className="h-4 w-4" />
          </HoldButton>
          <span />
          <HoldButton
            label="Tilt down"
            onHold={() => startHold((map) => map.setPitch(Math.max(0, map.getPitch() - PITCH_STEP)))}
            onRelease={stopHold}
          >
            <ChevronDown className="h-4 w-4" />
          </HoldButton>
          <span />
        </div>
        <p className="mt-1 text-center font-mono text-[10px] text-zinc-500">
          {Math.round(angles.pitch)}° · {Math.round(angles.bearing)}° · {angles.zoom.toFixed(1)}
        </p>
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/85 p-1.5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col gap-1">
          <HoldButton
            label="Zoom in"
            onHold={() => startZoomHold(1)}
            onRelease={stopHold}
          >
            <Plus className="h-4 w-4" />
          </HoldButton>
          <HoldButton
            label="Zoom out"
            onHold={() => startZoomHold(-1)}
            onRelease={stopHold}
          >
            <Minus className="h-4 w-4" />
          </HoldButton>
        </div>
      </div>
    </div>
  );
}

function HoldButton({
  label,
  children,
  onHold,
  onRelease,
}: {
  label: string;
  children: React.ReactNode;
  onHold: () => void;
  onRelease: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onPointerDown={(event) => {
        event.preventDefault();
        (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
        onHold();
      }}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-cyan-200",
        "active:bg-cyan-400/20 active:text-cyan-200",
      )}
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}
