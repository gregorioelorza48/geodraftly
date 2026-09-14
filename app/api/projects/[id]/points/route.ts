import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { collectProjectPoints } from "@/lib/gis/collect";
import { serializeCsv, serializeGeoJson } from "@/lib/gis/points";

async function authorize(projectId: string) {
  const current = await getCurrentUser();
  if (!current?.membership) return null;
  const project = await db.project.findFirst({
    where: { id: projectId, organizationId: current.membership.organizationId, deletedAt: null },
  });
  if (!project) return null;
  if (current.membership.role === "CLIENT") {
    const assigned = await db.projectMember.findFirst({
      where: { projectId, userId: current.user.id },
    });
    if (!assigned) return null;
  }
  return project;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await authorize(id);
  if (!project) return new NextResponse("Unauthorized", { status: 401 });

  const format = new URL(request.url).searchParams.get("format") ?? "csv";
  const points = await collectProjectPoints(id);
  const stamp = project.number.replace(/[^a-z0-9]+/gi, "-");

  if (format === "geojson") {
    const body = serializeGeoJson(points, `${project.number} ${project.name}`);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/geo+json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${stamp}-points.geojson"`,
      },
    });
  }

  const body = serializeCsv(points);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${stamp}-points.csv"`,
    },
  });
}
