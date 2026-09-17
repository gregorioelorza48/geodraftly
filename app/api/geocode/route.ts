import { NextResponse } from "next/server";
import { parseCoordinates } from "@/lib/design/geocode";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ error: "Type an address or coordinates." }, { status: 400 });
  }

  const coords = parseCoordinates(query);
  if (coords) return NextResponse.json(coords);

  const mapbox = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
  try {
    if (mapbox) {
      const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
      url.searchParams.set("access_token", mapbox);
      url.searchParams.set("limit", "1");
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Mapbox geocoding failed.");
      const data = (await response.json()) as {
        features?: { center?: [number, number]; place_name?: string }[];
      };
      const hit = data.features?.[0];
      if (hit?.center && hit.center.length >= 2) {
        return NextResponse.json({ center: [hit.center[0], hit.center[1]], label: hit.place_name ?? query });
      }
    } else {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", query);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": "Geodraftly/0.1 (workbench location search)",
        },
      });
      if (!response.ok) throw new Error("Address lookup failed.");
      const data = (await response.json()) as { lon?: string; lat?: string; display_name?: string }[];
      const hit = data[0];
      if (hit?.lon && hit.lat) {
        return NextResponse.json({
          center: [Number(hit.lon), Number(hit.lat)],
          label: hit.display_name ?? query,
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Address lookup failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ error: "No match for that address or coordinates." }, { status: 404 });
}
