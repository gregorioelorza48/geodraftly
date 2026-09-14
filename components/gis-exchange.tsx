"use client";

import { useActionState } from "react";
import { FormSubmit } from "@/components/form-submit";
import { Button, FieldError, Label } from "@/components/ui";
import { clearImportedPointsAction, importPointsAction } from "@/lib/actions/gis";

export function GisExchange({
  projectId,
  isClient,
  importedCount,
}: {
  projectId: string;
  isClient: boolean;
  importedCount: number;
}) {
  const [importState, importAction] = useActionState(
    async (_: unknown, data: FormData) => importPointsAction(projectId, data),
    undefined,
  );
  const [clearState, clearAction] = useActionState(async () => clearImportedPointsAction(projectId), undefined);

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <h2 className="font-serif text-xl">CSV + GeoJSON points</h2>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            Exchange WGS84 latitude/longitude points with Civil 3D. Export uses LL84 for Map Import or a custom
            Points-from-File format (Point, Latitude, Longitude, Elevation, Description). Import rejects
            northing/easting state-plane files — re-export those as lat/long first.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/projects/${projectId}/points?format=csv`}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-semibold hover:border-field/40"
          >
            Download CSV
          </a>
          <a
            href={`/api/projects/${projectId}/points?format=geojson`}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-semibold hover:border-field/40"
          >
            Download GeoJSON
          </a>
        </div>
      </div>

      {isClient ? (
        <p className="mt-4 text-sm text-ink-soft">
          {importedCount > 0
            ? `${importedCount} imported survey point${importedCount === 1 ? "" : "s"} on this map.`
            : "Ask the project team to import a Civil 3D point file if you need survey points here."}
        </p>
      ) : (
        <div className="mt-4 grid gap-4 border-t border-line pt-4 lg:grid-cols-[1fr_auto]">
          <form action={importAction} className="space-y-2">
            <Label htmlFor="gis-file">Import Civil 3D / survey points</Label>
            <input
              id="gis-file"
              name="file"
              type="file"
              accept=".csv,.geojson,.json,text/csv,application/geo+json,application/json"
              required
              className="block w-full text-sm text-ink-soft file:mr-3 file:h-11 file:rounded-lg file:border-0 file:bg-paper-2 file:px-3 file:text-sm file:font-semibold file:text-ink"
            />
            <FieldError
              message={
                importState && typeof importState === "object" && "error" in importState
                  ? String(importState.error)
                  : undefined
              }
            />
            {importState && "ok" in importState && importState.ok ? (
              <p className="text-sm text-field">Imported {importState.count} point{importState.count === 1 ? "" : "s"}.</p>
            ) : null}
            <FormSubmit>Import points</FormSubmit>
          </form>
          <div className="space-y-2 lg:pt-7">
            <p className="text-sm text-ink-soft">
              {importedCount} imported point{importedCount === 1 ? "" : "s"} on the map (steel pins).
            </p>
            {importedCount > 0 ? (
              <form action={clearAction}>
                <FieldError
                  message={
                    clearState && typeof clearState === "object" && "error" in clearState
                      ? String(clearState.error)
                      : undefined
                  }
                />
                <Button type="submit" variant="ghost">
                  Clear imported points
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
