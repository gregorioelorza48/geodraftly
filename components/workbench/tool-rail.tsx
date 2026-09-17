"use client";

import { Box, Car, Hand, MousePointer2, Pentagon, Spline } from "lucide-react";
import { useDesign } from "@/lib/design/store";
import type { DesignTool } from "@/lib/design/types";
import { cn } from "@/lib/utils";

const TOOLS: { id: DesignTool; label: string; hint: string; icon: typeof Hand }[] = [
  { id: "select", label: "Select", hint: "Drag to move a parcel, building, or parking lot", icon: MousePointer2 },
  { id: "pan", label: "Pan", hint: "Orbit, pan, and zoom the site", icon: Hand },
  { id: "polygon", label: "Site boundary", hint: "Draw a parcel polygon", icon: Pentagon },
  { id: "pad", label: "Building pad", hint: "Place a 3D pad inside the setback", icon: Box },
  { id: "parking", label: "Parking lot", hint: "Place a parking field", icon: Car },
  { id: "setback", label: "Setback", hint: "Apply a −15 ft interior setback", icon: Spline },
];

export function ToolRail() {
  const { tool, setTool, applySetbackTool } = useDesign();

  return (
    <div className="pointer-events-auto absolute left-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-1.5 shadow-2xl backdrop-blur-md">
      {TOOLS.map((item) => {
        const Icon = item.icon;
        const active = tool === item.id;
        return (
          <button
            key={item.id}
            type="button"
            title={`${item.label} — ${item.hint}`}
            onClick={() => {
              if (item.id === "setback") {
                applySetbackTool();
                return;
              }
              setTool(item.id);
            }}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl transition",
              active ? "bg-cyan-400/20 text-cyan-300 ring-1 ring-cyan-400/40" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="sr-only">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
