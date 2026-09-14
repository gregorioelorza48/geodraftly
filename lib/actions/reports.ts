"use server";

import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { generateObservationReport } from "@/lib/reports/generate";
import { buildFileKey, putFile } from "@/lib/storage";
import { format } from "date-fns";
import { revalidatePath } from "next/cache";

export async function generateReportAction(visitId: string) {
  const { organization, user } = await requireOrg();
  const visit = await db.siteVisit.findFirst({
    where: { id: visitId, deletedAt: null, project: { organizationId: organization.id } },
    include: {
      observer: true,
      project: { include: { organization: true } },
      observations: {
        where: { deletedAt: null },
        include: { photos: { where: { deletedAt: null } }, author: true },
        orderBy: { recordedAt: "asc" },
      },
      issues: { where: { deletedAt: null }, include: { assignee: true }, orderBy: { createdAt: "asc" } },
      photos: { where: { deletedAt: null } },
    },
  });
  if (!visit) return { error: "Visit not found." };

  const template = await db.reportTemplate.findFirst({
    where: { organizationId: organization.id },
    orderBy: { isDefault: "desc" },
  });

  const title = `Site Observation Report — ${visit.project.number} — ${format(visit.visitedAt, "yyyy-MM-dd")}`;

  const report = await db.generatedReport.create({
    data: {
      projectId: visit.projectId,
      siteVisitId: visit.id,
      templateId: template?.id,
      generatedById: user.id,
      title,
      status: "GENERATING",
    },
  });

  try {
    const pdf = await generateObservationReport(visit);
    const key = buildFileKey(`projects/${visit.projectId}/reports`, `${title}.pdf`);
    await putFile(key, pdf, "application/pdf");

    await db.generatedReport.update({
      where: { id: report.id },
      data: { fileKey: key, status: "READY" },
    });

    await logActivity({
      organizationId: organization.id,
      projectId: visit.projectId,
      actorId: user.id,
      kind: "REPORT_GENERATED",
      message: `${user.name} generated a site observation report for ${visit.project.number}`,
    });

    revalidatePath(`/projects/${visit.projectId}`);
    return { ok: true, id: report.id };
  } catch (error) {
    await db.generatedReport.update({
      where: { id: report.id },
      data: { status: "FAILED", errorMessage: error instanceof Error ? error.message : "Failed" },
    });
    return { error: error instanceof Error ? error.message : "Could not generate report." };
  }
}
