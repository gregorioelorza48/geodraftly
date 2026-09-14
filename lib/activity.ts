import { db } from "./db";

export async function logActivity(input: {
  organizationId: string;
  projectId?: string | null;
  actorId: string;
  kind: string;
  message: string;
}) {
  await db.activity.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId ?? null,
      actorId: input.actorId,
      kind: input.kind,
      message: input.message,
    },
  });
}
