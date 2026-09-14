"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { assertStaff, requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { formError, visitSchema } from "@/lib/validations";

export async function createVisitAction(projectId: string, formData: FormData) {
  const { organization, user, membership } = await requireOrg();
  try {
    assertStaff(membership.role);
  } catch (error) {
    return { error: formError(error) };
  }
  const project = await db.project.findFirst({
    where: { id: projectId, organizationId: organization.id, deletedAt: null },
  });
  if (!project) return { error: "Project not found." };

  try {
    const parsed = visitSchema.parse({
      visitedAt: formData.get("visitedAt"),
      weather: formData.get("weather"),
      temperatureF: formData.get("temperatureF") || null,
      notes: formData.get("notes"),
      status: "IN_PROGRESS",
    });

    const visit = await db.siteVisit.create({
      data: {
        projectId,
        observerId: user.id,
        visitedAt: new Date(parsed.visitedAt),
        weather: parsed.weather ?? "",
        temperatureF: parsed.temperatureF ?? null,
        notes: parsed.notes ?? "",
        status: "IN_PROGRESS",
      },
    });

    await logActivity({
      organizationId: organization.id,
      projectId,
      actorId: user.id,
      kind: "VISIT_CREATED",
      message: `${user.name} started a site visit on ${project.number}`,
    });

    redirect(`/projects/${projectId}/visits/${visit.id}`);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    return { error: formError(error) };
  }
}

export async function updateVisitAction(visitId: string, formData: FormData) {
  const { organization } = await requireOrg();
  const visit = await db.siteVisit.findFirst({
    where: { id: visitId, deletedAt: null, project: { organizationId: organization.id } },
  });
  if (!visit) return { error: "Visit not found." };

  try {
    const parsed = visitSchema.parse({
      visitedAt: formData.get("visitedAt"),
      weather: formData.get("weather"),
      temperatureF: formData.get("temperatureF") || null,
      notes: formData.get("notes"),
      recommendations: formData.get("recommendations"),
      status: formData.get("status") || visit.status,
    });

    const status = parsed.status ?? visit.status;
    await db.siteVisit.update({
      where: { id: visit.id },
      data: {
        visitedAt: new Date(parsed.visitedAt),
        weather: parsed.weather ?? "",
        temperatureF: parsed.temperatureF ?? null,
        notes: parsed.notes ?? "",
        recommendations: parsed.recommendations ?? "",
        status,
        completedAt: status === "COMPLETED" ? visit.completedAt ?? new Date() : null,
      },
    });

    revalidatePath(`/projects/${visit.projectId}/visits/${visit.id}`);
    return { ok: true };
  } catch (error) {
    return { error: formError(error) };
  }
}

export async function completeVisitAction(visitId: string) {
  const { organization, user } = await requireOrg();
  const visit = await db.siteVisit.findFirst({
    where: { id: visitId, deletedAt: null, project: { organizationId: organization.id } },
    include: { project: true },
  });
  if (!visit) return { error: "Visit not found." };

  await db.siteVisit.update({
    where: { id: visit.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await logActivity({
    organizationId: organization.id,
    projectId: visit.projectId,
    actorId: user.id,
    kind: "VISIT_COMPLETED",
    message: `${user.name} completed a site visit on ${visit.project.number}`,
  });

  revalidatePath(`/projects/${visit.projectId}/visits/${visit.id}`);
  return { ok: true };
}
