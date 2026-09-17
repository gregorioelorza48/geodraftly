"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { parseCoordinates, type GeocodeHit } from "@/lib/design/geocode";
import { useDesign } from "@/lib/design/store";
import { cn } from "@/lib/utils";

export function SearchPill() {
  const { goToLocation, setError } = useDesign();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      const local = parseCoordinates(text);
      const hit = local ?? (await lookup(text));
      goToLocation(hit.center);
      setQuery(hit.label);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not find that location.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="relative min-w-0 max-w-md flex-1"
      role="search"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Address or 32.62, −96.77"
        autoComplete="off"
        aria-label="Search address or coordinates"
        className={cn(
          "h-8 w-full rounded-full border border-zinc-800 bg-zinc-900/80 py-0 pl-9 pr-14 text-xs text-zinc-100 outline-none placeholder:text-zinc-500",
          "focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20",
        )}
      />
      <button
        type="submit"
        disabled={busy || !query.trim()}
        className="absolute right-1 top-1/2 inline-flex h-6 -translate-y-1/2 items-center rounded-full bg-cyan-400/15 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200 hover:bg-cyan-400/25 disabled:opacity-40"
      >
        {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : "Go"}
      </button>
    </form>
  );
}

async function lookup(query: string): Promise<GeocodeHit> {
  const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  const data = (await response.json()) as GeocodeHit & { error?: string };
  if (!response.ok || !data.center) {
    throw new Error(data.error || "No match for that address or coordinates.");
  }
  return { center: data.center, label: data.label };
}
