import { NextResponse } from "next/server";
import { serializeDwg } from "@/lib/design/dwg";
import type { Ring, SiteFeature } from "@/lib/design/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { features?: SiteFeature[]; setback?: Ring | null };
    const bytes = serializeDwg(body.features ?? [], body.setback ?? null);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/acad",
        "Content-Disposition": 'attachment; filename="layout.dwg"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not write a DWG file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
