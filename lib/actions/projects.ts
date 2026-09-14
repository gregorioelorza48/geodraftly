"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { assertStaff, requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { formError, projectSchema } from "@/lib/validations";

export async function createProjectAction(_: unknown, formData: FormData) {
  const { organization, user, membership } = await requireOrg();
  try {
    assertStaff(membership.role);
    const parsed = projectSchema.parse({
      name: formData.get("name"),
      number: formData.get("number"),
      client: formData.get("client"),
      address: formData.get("address"),
      city: formData.get("city"),
      state: formData.get("state"),
      postalCode: formData.get("postalCode"),
      type: formData.get("type"),
      description: formData.get("description"),
      latitude: formData.get("latitude") || null,
      longitude: formData.get("longitude") || null,
    });

    const duplicate = await db.project.findFirst({
      where: { organizationId: organization.id, number: parsed.number, deletedAt: null },
    });
    if (duplicate) return { error: "A project with that number already exists." };

    const project = await db.project.create({
      data: {
        organizationId: organization.id,
        name: parsed.name,
        number: parsed.number,
        client: parsed.client,
        address: parsed.address,
        city: parsed.city ?? "",
        state: parsed.state ?? "",
        postalCode: parsed.postalCode ?? "",
        type: parsed.type,
        description: parsed.description ?? "",
        latitude: parsed.latitude ?? null,
        longitude: parsed.longitude ?? null,
      },
    });

    await db.projectMember.create({
      data: { projectId: project.id, userId: user.id, role: "LEAD" },
    });

    await logActivity({
      organizationId: organization.id,
      projectId: project.id,
      actorId: user.id,
      kind: "PROJECT_CREATED",
      message: `${user.name} created project ${project.number} — ${project.name}`,
    });

    redirect(`/projects/${project.id}`);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    return { error: formError(error) };
  }
}

export async function updateProjectAction(projectId: string, formData: FormData) {
  const { organization, user } = await requireOrg();
  const project = await db.project.findFirst({
    where: { id: projectId, organizationId: organization.id, deletedAt: null },
  });
  if (!project) return { error: "Project not found." };

  try {
    const parsed = projectSchema.parse({
      name: formData.get("name"),
      number: formData.get("number"),
      client: formData.get("client"),
      address: formData.get("address"),
      city: formData.get("city"),
      state: formData.get("state"),
      postalCode: formData.get("postalCode"),
      type: formData.get("type"),
      status: formData.get("status"),
      description: formData.get("description"),
      latitude: formData.get("latitude") || null,
      longitude: formData.get("longitude") || null,
    });

    await db.project.update({
      where: { id: project.id },
      data: {
        name: parsed.name,
        number: parsed.number,
        client: parsed.client,
        address: parsed.address,
        city: parsed.city ?? "",
        state: parsed.state ?? "",
        postalCode: parsed.postalCode ?? "",
        type: parsed.type,
        status: parsed.status ?? project.status,
        description: parsed.description ?? "",
        latitude: parsed.latitude ?? null,
        longitude: parsed.longitude ?? null,
      },
    });

    revalidatePath(`/projects/${project.id}`);
    return { ok: true };
  } catch (error) {
    return { error: formError(error) };
  }
}

export async function addProjectMemberAction(projectId: string, formData: FormData) {
  const { organization } = await requireOrg();
  const project = await db.project.findFirst({
    where: { id: projectId, organizationId: organization.id, deletedAt: null },
  });
  if (!project) return { error: "Project not found." };

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "MEMBER");
  if (!userId) return { error: "Choose a teammate." };

  const member = await db.organizationMember.findFirst({
    where: { organizationId: organization.id, userId },
  });
  if (!member) return { error: "That person is not in this firm." };

  await db.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: { role: role === "LEAD" || role === "VIEWER" ? role : "MEMBER" },
    create: {
      projectId,
      userId,
      role: role === "LEAD" || role === "VIEWER" ? role : "MEMBER",
    },
  });

  revalidatePath(`/projects/${projectId}/team`);
  return { ok: true };
}
