"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { assertProjectAccess, assertStaff, requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { publishComment, type CollabComment } from "@/lib/collab";
import { formError } from "@/lib/validations";
import { z } from "zod";

const pinSchema = z
  .object({
    kind: z.enum(["PHOTO", "MAP"]),
    body: z.string().min(1, "Write a comment").max(4000),
    photoId: z.string().optional().or(z.literal("")),
    x: z.coerce.number().min(0).max(1).optional().nullable(),
    y: z.coerce.number().min(0).max(1).optional().nullable(),
    latitude: z.coerce.number().optional().nullable(),
    longitude: z.coerce.number().optional().nullable(),
    parentId: z.string().optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "PHOTO" && !value.photoId) {
      ctx.addIssue({ code: "custom", message: "Choose a photo.", path: ["photoId"] });
    }
    if (value.kind === "MAP" && (value.latitude == null || value.longitude == null) && !value.parentId) {
      ctx.addIssue({ code: "custom", message: "Drop a pin on the map.", path: ["latitude"] });
    }
  });

function toPayload(
  row: {
    id: string;
    projectId: string;
    authorId: string;
    kind: string;
    body: string;
    photoId: string | null;
    x: number | null;
    y: number | null;
    latitude: number | null;
    longitude: number | null;
    parentId: string | null;
    createdAt: Date;
    author: { name: string };
  },
  authorRole: string,
): CollabComment {
  return {
    id: row.id,
    projectId: row.projectId,
    authorId: row.authorId,
    authorName: row.author.name,
    authorRole,
    kind: row.kind,
    body: row.body,
    photoId: row.photoId,
    x: row.x,
    y: row.y,
    latitude: row.latitude,
    longitude: row.longitude,
    parentId: row.parentId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createPinCommentAction(projectId: string, input: {
  kind: "PHOTO" | "MAP";
  body: string;
  photoId?: string;
  x?: number | null;
  y?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  parentId?: string;
}) {
  const { user, membership } = await assertProjectAccess(projectId);
  const parsed = pinSchema.parse(input);

  if (parsed.photoId) {
    const photo = await db.photo.findFirst({
      where: { id: parsed.photoId, projectId, deletedAt: null },
    });
    if (!photo) return { error: "Photo not found." };
  }

  const row = await db.pinComment.create({
    data: {
      projectId,
      authorId: user.id,
      kind: parsed.kind,
      body: parsed.body,
      photoId: parsed.photoId || null,
      x: parsed.x ?? null,
      y: parsed.y ?? null,
      latitude: parsed.latitude ?? null,
      longitude: parsed.longitude ?? null,
      parentId: parsed.parentId || null,
    },
    include: { author: true },
  });

  const payload = toPayload(row, membership.role);
  publishComment(payload);
  revalidatePath(`/projects/${projectId}/photos`);
  revalidatePath(`/projects/${projectId}/map`);
  return { ok: true, comment: payload };
}

export async function listPinComments(projectId: string) {
  await assertProjectAccess(projectId);
  const rows = await db.pinComment.findMany({
    where: { projectId, deletedAt: null },
    include: { author: true },
    orderBy: { createdAt: "asc" },
  });
  const members = await db.organizationMember.findMany({
    where: { userId: { in: [...new Set(rows.map((r) => r.authorId))] } },
    select: { userId: true, role: true },
  });
  const roleByUser = Object.fromEntries(members.map((m) => [m.userId, m.role]));
  return rows.map((row) => toPayload(row, roleByUser[row.authorId] ?? "MEMBER"));
}

export async function inviteClientAction(projectId: string, formData: FormData) {
  const { organization, membership } = await requireOrg();
  try {
    assertStaff(membership.role);
  } catch (error) {
    return { error: formError(error) };
  }

  const project = await db.project.findFirst({
    where: { id: projectId, organizationId: organization.id, deletedAt: null },
  });
  if (!project) return { error: "Project not found." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  if (name.length < 2) return { error: "Enter the client's name." };
  if (!email.includes("@")) return { error: "Enter a valid email." };

  let client = await db.user.findUnique({ where: { email } });
  if (!client) {
    if (password.length < 8) return { error: "Set a password (8+ characters) for a new client account." };
    client = await db.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 12) },
    });
  }

  await db.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: client.id } },
    update: { role: "CLIENT" },
    create: { organizationId: organization.id, userId: client.id, role: "CLIENT" },
  });

  await db.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: client.id } },
    update: { role: "CLIENT" },
    create: { projectId, userId: client.id, role: "CLIENT" },
  });

  revalidatePath(`/projects/${projectId}/team`);
  return { ok: true };
}
