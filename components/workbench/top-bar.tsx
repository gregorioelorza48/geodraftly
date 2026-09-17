"use client";

import { useRef, useState } from "react";
import { Download, Save, Upload } from "lucide-react";
import { SearchPill } from "@/components/workbench/search-pill";
import { UserMenu } from "@/components/workbench/user-menu";
import { useSaveProject } from "@/components/workbench/use-save-project";
import { serializeDxf } from "@/lib/design/dxf";
import { downloadBytes, downloadText } from "@/lib/design/download";
import { toFeatureCollection } from "@/lib/design/geo";
import { parseShapefileZip } from "@/lib/design/shapefile";
import { useDesign } from "@/lib/design/store";
import { cn } from "@/lib/utils";

export function TopBar({ cursorLabel }: { cursorLabel: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [exportingDwg, setExportingDwg] = useState(false);
  const { project, projects, setProjectId, features, setback, importSite, setError, setImporting, sourceName, importing } = useDesign();
  const { saveProject, status, message } = useSaveProject();

  async function importZip(file: File) {
    setError(null);
    setImporting("Reading shapefile… city extracts can take a minute.");
    await new Promise((resolve) => window.setTimeout(resolve, 40));
    try {
      const parsed = await parseShapefileZip(file);
      setImporting("Adding map layers…");
      importSite(parsed);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not read that shapefile.");
    } finally {
      setImporting(null);
    }
  }

  function exportGeoJson() {
    const stamp = (project?.number ?? "site").replace(/[^a-z0-9]+/gi, "-");
    downloadText(`${stamp}-layout.geojson`, JSON.stringify(toFeatureCollection(features, setback), null, 2), "application/geo+json");
  }

  function exportDxf() {
    const stamp = (project?.number ?? "site").replace(/[^a-z0-9]+/gi, "-");
    downloadText(`${stamp}-layout.dxf`, serializeDxf(features, setback), "application/dxf");
  }

  async function exportDwg() {
    setError(null);
    setExportingDwg(true);
    try {
      const stamp = (project?.number ?? "site").replace(/[^a-z0-9]+/gi, "-");
      const response = await fetch("/api/export/dwg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features, setback }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Could not write a DWG file.");
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      downloadBytes(`${stamp}-layout.dwg`, bytes, "application/acad");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not write a DWG file.");
    } finally {
      setExportingDwg(false);
    }
  }

  return (
    <header className="relative z-30 flex h-12 min-w-0 items-center gap-2 border-b border-zinc-800 bg-zinc-950/85 px-3 backdrop-blur-md">
      <div className="min-w-0 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">Geodraftly</p>
        <select
          value={project?.id ?? ""}
          onChange={(event) => setProjectId(event.target.value)}
          className="max-w-[240px] truncate bg-transparent text-sm font-semibold text-zinc-100 outline-none"
        >
          {projects.length === 0 ? <option value="">No project</option> : null}
          {projects.map((item) => (
            <option key={item.id} value={item.id} className="bg-zinc-900 text-zinc-100">
              {item.number} · {item.name}
            </option>
          ))}
        </select>
      </div>

      <SearchPill />

      <div className="hidden items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-2.5 py-1 font-mono text-[11px] text-zinc-400 2xl:flex">
        <span className="text-zinc-600">CRS</span>
        <span className="text-zinc-200">WGS84 · EPSG:4326</span>
        <span className="text-zinc-600">·</span>
        <span>{cursorLabel}</span>
      </div>

      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files[0];
          if (file) void importZip(file);
        }}
        className={cn(
          "flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 text-xs font-semibold transition",
          importing && "pointer-events-none opacity-70",
          dragOver ? "border-cyan-400 bg-cyan-400/10 text-cyan-200" : "border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-zinc-500",
        )}
      >
        <Upload className="h-3.5 w-3.5" />
        {importing ? "Importing…" : (sourceName ?? "Import .zip shapefile")}
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          disabled={Boolean(importing)}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importZip(file);
            event.target.value = "";
          }}
        />
      </label>

      <button
        type="button"
        onClick={exportDxf}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 text-xs font-semibold text-zinc-200 hover:border-zinc-600"
      >
        <Download className="h-3.5 w-3.5" />
        Export DXF
      </button>
      <button
        type="button"
        onClick={() => void exportDwg()}
        disabled={exportingDwg}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 text-xs font-semibold text-zinc-200 hover:border-zinc-600 disabled:opacity-60"
      >
        <Download className="h-3.5 w-3.5" />
        {exportingDwg ? "Writing DWG…" : "Export DWG"}
      </button>
      <button
        type="button"
        onClick={exportGeoJson}
        className="hidden h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 text-xs font-semibold text-zinc-200 hover:border-zinc-600 2xl:inline-flex"
      >
        <Download className="h-3.5 w-3.5" />
        Export GeoJSON
      </button>
      <button
        type="button"
        onClick={() => void saveProject()}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/20"
      >
        <Save className="h-3.5 w-3.5" />
        {status === "saving" ? "Saving…" : "Save Project"}
      </button>
      {message ? <span className="hidden max-w-[160px] truncate text-[11px] text-zinc-500 lg:inline">{message}</span> : null}
      <UserMenu />
    </header>
  );
}
