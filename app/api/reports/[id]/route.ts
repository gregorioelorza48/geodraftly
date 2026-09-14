import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFileBuffer } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current?.membership) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const report = await db.generatedReport.findFirst({
    where: { id, project: { organizationId: current.membership.organizationId } },
  });
  if (!report?.fileKey || report.status !== "READY") {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = new Uint8Array(await getFileBuffer(report.fileKey));
  const filename = `${report.title.replace(/[^a-z0-9]+/gi, "-")}.pdf`;
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
