"use client";

import { AuthProvider } from "@/lib/auth-client/AuthContext";
import { DesignProvider, useDesign } from "@/lib/design/store";
import type { DesignProject } from "@/lib/design/types";
import { AuthModal } from "./AuthModal";
import { SaveOnAuth } from "./save-on-auth";
import { DesignCanvas } from "./design-canvas";
import { InspectorPanel } from "./inspector-panel";
import { ToolRail } from "./tool-rail";
import { TopBar } from "./top-bar";

function WorkbenchStage() {
  const { cursor, tool, draftRing, error, importing } = useDesign();
  const coord = cursor ? `${cursor[1].toFixed(6)}, ${cursor[0].toFixed(6)}` : "—";

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-200">
      <TopBar cursorLabel={coord} />
      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-[4]">
          <DesignCanvas />
          <ToolRail />
          {draftRing.length > 0 ? (
            <p className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300 backdrop-blur-md">
              {draftRing.length} vertices · Enter or double-click to close · Esc to cancel
            </p>
          ) : (
            <p className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-500 backdrop-blur-md">
              {tool === "polygon"
                ? "Click to draw the site boundary"
                : tool === "pad"
                  ? "Click to place a 3D building — the map tilts so you can see height"
                  : tool === "parking"
                    ? "Click to place an amber parking lot — the map zooms in if you are looking at the whole city"
                    : tool === "pan"
                      ? "Hold the camera pad to tilt and rotate slowly · arrows also work"
                      : tool === "pencil"
                        ? "Drag to sketch · click to drop a mark · Delete removes it"
                        : "Drag a parcel, building, or parking lot to move it · Delete to remove"}
            </p>
          )}
          {importing ? (
            <p className="absolute bottom-14 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-cyan-400/30 bg-zinc-950/85 px-3 py-1.5 text-xs text-cyan-100 backdrop-blur-md">
              {importing}
            </p>
          ) : error ? (
            <p className="absolute bottom-14 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-red-500/30 bg-red-950/80 px-3 py-1.5 text-xs text-red-200 backdrop-blur-md">
              {error}
            </p>
          ) : null}
        </div>
        <InspectorPanel />
      </div>
    </div>
  );
}

export function DesignWorkbench({ projects }: { projects: DesignProject[] }) {
  return (
    <AuthProvider>
      <DesignProvider projects={projects}>
        <WorkbenchStage />
        <SaveOnAuth />
        <AuthModal />
      </DesignProvider>
    </AuthProvider>
  );
}
