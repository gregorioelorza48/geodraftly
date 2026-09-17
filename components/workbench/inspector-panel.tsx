"use client";

import { useEffect } from "react";
import { ChevronRight, ClipboardList, Save, Trash2, Undo2 } from "lucide-react";
import { useSaveProject } from "@/components/workbench/use-save-project";
import { formatAcres, formatArea, formatFeet, parkingSpecs } from "@/lib/design/metrics";
import { useDesign } from "@/lib/design/store";
import { cn } from "@/lib/utils";

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-sm text-zinc-100">
        {value}
        {unit ? <span className="ml-1 text-zinc-500">{unit}</span> : null}
      </p>
    </div>
  );
}

export function InspectorPanel() {
  const {
    inspectorOpen,
    setInspectorOpen,
    punchList,
    setPunchList,
    metrics,
    padHeightFt,
    setPadHeightFt,
    parkingRatio,
    setParkingRatio,
    setbackFt,
    setSetbackFt,
    selectedId,
    features,
    overlays,
    deleteSelected,
    undo,
    canUndo,
  } = useDesign();

  const selected = features.find((f) => f.id === selectedId);
  const lot = selected?.kind === "parking" ? parkingSpecs(selected.ring) : null;
  const { saveProject, status, message } = useSaveProject();

  useEffect(() => {
    if (lot) setInspectorOpen(true);
  }, [lot, selectedId, setInspectorOpen]);

  if (!inspectorOpen) {
    return (
      <div className="fixed right-3 top-[3.75rem] z-30 flex w-80 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950/95 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">Report</p>
            <h2 className="text-sm font-semibold text-zinc-100">Punch list</h2>
          </div>
          <button
            type="button"
            onClick={() => setInspectorOpen(true)}
            className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
          >
            Inspector
          </button>
        </div>
        <label className="sr-only" htmlFor="punch-list">
          Punch list notes for the site observation report
        </label>
        <textarea
          id="punch-list"
          value={punchList}
          onChange={(event) => setPunchList(event.target.value)}
          placeholder="Items to include in the site observation report…"
          rows={8}
          className="min-h-[10rem] resize-y bg-transparent px-3 py-2.5 text-sm leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600"
        />
      </div>
    );
  }

  return (
    <aside className="relative z-20 flex h-full w-[20vw] min-w-[280px] max-w-[380px] flex-col border-l border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">Inspector</p>
          <h2 className="text-sm font-semibold text-zinc-100">{lot ? "Parking lot specs" : "Spatial metrics"}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setInspectorOpen(false)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            title="Close inspector and open punch list"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Punch list
          </button>
          <button
            type="button"
            onClick={() => setInspectorOpen(false)}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Close inspector"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {lot ? (
          <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200">Selected parking lot</p>
            <p className="mt-1 text-sm font-semibold text-amber-50">{selected?.name}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Metric label="Footprint" value={`${Math.round(lot.widthFt)} × ${Math.round(lot.depthFt)}`} unit="ft" />
              <Metric label="Area" value={formatArea(lot.areaSqFt)} />
              <Metric label="Acres" value={formatAcres(lot.acres)} />
              <Metric label="Stalls" value={String(lot.stalls)} />
              <Metric label="Module" value={`${lot.sfPerStall}`} unit="sf / stall" />
              <Metric label="Perimeter" value={formatFeet(lot.perimeterFt)} />
            </div>
            {lot.center ? (
              <p className="mt-3 font-mono text-[11px] text-amber-100/80">
                {lot.center[1].toFixed(6)}, {lot.center[0].toFixed(6)}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Parcel" value={formatAcres(metrics.parcelAcres)} />
          <Metric label="Parcel area" value={formatArea(metrics.parcelSqFt)} />
          <Metric label="Buildable" value={formatAcres(metrics.buildableAcres)} />
          <Metric label="After setback" value={formatArea(metrics.buildableSqFt)} />
        </div>

        <div>
          <label className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Building height
            <span className="font-mono text-cyan-300">{padHeightFt.toFixed(0)} ft</span>
          </label>
          <input
            type="range"
            min={12}
            max={80}
            step={1}
            value={padHeightFt}
            onChange={(event) => setPadHeightFt(Number(event.target.value))}
            className="w-full accent-cyan-400"
          />
          <p className="mt-1 text-[11px] text-zinc-500">Extrudes the Three.js pad mesh in real time.</p>
        </div>

        <div>
          <label className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Interior setback
            <span className="font-mono text-yellow-300">−{setbackFt} ft</span>
          </label>
          <input
            type="range"
            min={5}
            max={50}
            step={1}
            value={setbackFt}
            onChange={(event) => setSetbackFt(Number(event.target.value))}
            className="w-full accent-yellow-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Metric label="Target ratio" value={parkingRatio.toFixed(1)} unit="/ 1000 sf" />
          <Metric label="Target stalls" value={String(metrics.targetStalls)} />
          <Metric label="Lot stalls" value={String(metrics.calculatedStalls)} />
          <Metric label="Cut / fill" value={metrics.cutFillCy ? metrics.cutFillCy.toLocaleString() : "—"} unit="CY" />
        </div>

        <div>
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Parking ratio
          </label>
          <input
            type="range"
            min={1}
            max={8}
            step={0.5}
            value={parkingRatio}
            onChange={(event) => setParkingRatio(Number(event.target.value))}
            className="w-full accent-zinc-200"
          />
        </div>

        <div className={cn("rounded-xl border px-3 py-2.5", selected ? "border-cyan-400/30 bg-cyan-400/5" : "border-zinc-800")}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Selected object</p>
          <p className="mt-1 text-sm text-zinc-200">{selected ? `${selected.name} · ${selected.kind}` : "Nothing selected"}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={deleteSelected}
              disabled={!selected}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/40 text-xs font-semibold text-red-200 hover:bg-red-900/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-200 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </button>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            {selected?.kind === "mark"
              ? "Delete / Backspace removes this sketch."
              : "Drag on the map to move the selection. Delete / Backspace removes it."}
          </p>
        </div>
        {overlays.length ? (
          <div className="rounded-xl border border-zinc-800 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Imported layers</p>
            <ul className="mt-2 space-y-1 text-xs text-zinc-400">
              {overlays.map((layer) => (
                <li key={layer.id} className="flex justify-between gap-2">
                  <span className="capitalize">{layer.kind}</span>
                  <span className="font-mono text-zinc-300">{layer.collection.features.length.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => void saveProject()}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 text-sm font-semibold text-zinc-950 hover:bg-cyan-300"
        >
          <Save className="h-4 w-4" />
          {status === "saving" ? "Saving…" : "Save Project"}
        </button>
        {message ? <p className="text-[11px] text-zinc-500">{message}</p> : null}
      </div>
    </aside>
  );
}
