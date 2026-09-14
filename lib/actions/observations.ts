"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildFileKey, putFile } from "@/lib/storage";
import { commentSchema, formError, observationSchema } from "@/lib/validations";

export async function createObservationAction(visitId: string, formData: FormData) {
  const { organization, user } = await requireOrg();
  const visit = await db.siteVisit.findFirst({
    where: { id: visitId, deletedAt: null, project: { organizationId: organization.id } },
  });
  if (!visit) return { error: "Visit not found." };

  try {
    const parsed = observationSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      category: formData.get("category"),
      priority: formData.get("priority"),
      latitude: formData.get("latitude") || null,
      longitude: formData.get("longitude") || null,
    });

    const observation = await db.observation.create({
      data: {
        projectId: visit.projectId,
        siteVisitId: visit.id,
        authorId: user.id,
        title: parsed.title,
        description: parsed.description ?? "",
        category: parsed.category,
        priority: parsed.priority,
        latitude: parsed.latitude ?? null,
        longitude: parsed.longitude ?? null,
      },
    });

    const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    for (const file of files.slice(0, 12)) {
      if (file.size > 15 * 1024 * 1024) continue;
      if (!file.type.startsWith("image/")) continue;
      const key = buildFileKey(`projects/${visit.projectId}/photos`, file.name);
      await putFile(key, Buffer.from(await file.arrayBuffer()), file.type);
      await db.photo.create({
        data: {
          projectId: visit.projectId,
          siteVisitId: visit.id,
          observationId: observation.id,
          uploadedById: user.id,
          fileKey: key,
          contentType: file.type,
          caption: file.name,
        },
      });
    }

    await logActivity({
      organizationId: organization.id,
      projectId: visit.projectId,
      actorId: user.id,
      kind: "OBSERVATION_CREATED",
      message: `${user.name} logged “${observation.title}”`,
    });

    revalidatePath(`/projects/${visit.projectId}/visits/${visit.id}`);
    redirect(`/projects/${visit.projectId}/visits/${visit.id}?obs=${observation.id}`);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    return { error: formError(error) };
  }
}

export async function updateObservationAction(observationId: string, formData: FormData) {
  const { organization } = await requireOrg();
  const observation = await db.observation.findFirst({
    where: { id: observationId, deletedAt: null, project: { organizationId: organization.id } },
  });
  if (!observation) return { error: "Observation not found." };

  try {
    const parsed = observationSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      category: formData.get("category"),
      priority: formData.get("priority"),
      status: formData.get("status") || observation.status,
      latitude: formData.get("latitude") || null,
      longitude: formData.get("longitude") || null,
    });

    await db.observation.update({
      where: { id: observation.id },
      data: {
        title: parsed.title,
        description: parsed.description ?? "",
        category: parsed.category,
        priority: parsed.priority,
        status: parsed.status ?? observation.status,
        latitude: parsed.latitude ?? null,
        longitude: parsed.longitude ?? null,
      },
    });

    revalidatePath(`/projects/${observation.projectId}`);
    return { ok: true };
  } catch (error) {
    return { error: formError(error) };
  }
}

export async function addObservationCommentAction(observationId: string, formData: FormData) {
  const { organization, user } = await requireOrg();
  const observation = await db.observation.findFirst({
    where: { id: observationId, deletedAt: null, project: { organizationId: organization.id } },
  });
  if (!observation) return { error: "Observation not found." };

  try {
    const parsed = commentSchema.parse({ body: formData.get("body") });
    await db.comment.create({
      data: { observationId, authorId: user.id, body: parsed.body },
    });
    revalidatePath(`/projects/${observation.projectId}`);
    return { ok: true };
  } catch (error) {
    return { error: formError(error) };
  }
}

export async function uploadVisitPhotosAction(visitId: string, formData: FormData) {
  const { organization, user } = await requireOrg();
  const visit = await db.siteVisit.findFirst({
    where: { id: visitId, deletedAt: null, project: { organizationId: organization.id } },
  });
  if (!visit) return { error: "Visit not found." };

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one photo." };

  for (const file of files.slice(0, 20)) {
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) continue;
    const key = buildFileKey(`projects/${visit.projectId}/photos`, file.name);
    await putFile(key, Buffer.from(await file.arrayBuffer()), file.type);
    await db.photo.create({
      data: {
        projectId: visit.projectId,
        siteVisitId: visit.id,
        uploadedById: user.id,
        fileKey: key,
        contentType: file.type,
        caption: String(formData.get("caption") ?? file.name),
      },
    });
  }

  revalidatePath(`/projects/${visit.projectId}/visits/${visit.id}`);
  return { ok: true };
}
