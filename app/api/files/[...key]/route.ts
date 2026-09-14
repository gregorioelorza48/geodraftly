import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFileBuffer } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const current = await getCurrentUser();
  if (!current?.membership) return new NextResponse("Unauthorized", { status: 401 });

  const key = (await params).key.join("/");
  const photo = await db.photo.findFirst({
    where: { fileKey: key, deletedAt: null },
    include: { project: true },
  });
  const report = photo
    ? null
    : await db.generatedReport.findFirst({
        where: { fileKey: key },
        include: { project: true },
      });

  const project = photo?.project ?? report?.project;
  if (!project || project.organizationId !== current.membership.organizationId) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const buffer = await getFileBuffer(key);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": photo?.contentType ?? "application/pdf",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
