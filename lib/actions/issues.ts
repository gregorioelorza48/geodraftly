"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { commentSchema, formError, issueSchema, taskSchema } from "@/lib/validations";

export async function createIssueAction(projectId: string, formData: FormData) {
  const { organization, user } = await requireOrg();
  const project = await db.project.findFirst({
    where: { id: projectId, organizationId: organization.id, deletedAt: null },
  });
  if (!project) return { error: "Project not found." };

  try {
    const parsed = issueSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      priority: formData.get("priority"),
      assigneeId: formData.get("assigneeId"),
      dueDate: formData.get("dueDate"),
      observationId: formData.get("observationId"),
      siteVisitId: formData.get("siteVisitId"),
    });

    const issue = await db.issue.create({
      data: {
        projectId,
        createdById: user.id,
        title: parsed.title,
        description: parsed.description ?? "",
        priority: parsed.priority,
        assigneeId: parsed.assigneeId || null,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        observationId: parsed.observationId || null,
        siteVisitId: parsed.siteVisitId || null,
      },
    });

    await logActivity({
      organizationId: organization.id,
      projectId,
      actorId: user.id,
      kind: "ISSUE_CREATED",
      message: `${user.name} opened punch item “${issue.title}”`,
    });

    revalidatePath(`/projects/${projectId}`);
    return { ok: true, id: issue.id };
  } catch (error) {
    return { error: formError(error) };
  }
}

export async function updateIssueAction(issueId: string, formData: FormData) {
  const { organization, user } = await requireOrg();
  const issue = await db.issue.findFirst({
    where: { id: issueId, deletedAt: null, project: { organizationId: organization.id } },
  });
  if (!issue) return { error: "Issue not found." };

  try {
    const parsed = issueSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      priority: formData.get("priority"),
      status: formData.get("status") || issue.status,
      assigneeId: formData.get("assigneeId"),
      dueDate: formData.get("dueDate"),
    });

    await db.issue.update({
      where: { id: issue.id },
      data: {
        title: parsed.title,
        description: parsed.description ?? "",
        priority: parsed.priority,
        status: parsed.status ?? issue.status,
        assigneeId: parsed.assigneeId || null,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      },
    });

    await logActivity({
      organizationId: organization.id,
      projectId: issue.projectId,
      actorId: user.id,
      kind: "ISSUE_UPDATED",
      message: `${user.name} updated punch item “${parsed.title}”`,
    });

    revalidatePath(`/projects/${issue.projectId}`);
    return { ok: true };
  } catch (error) {
    return { error: formError(error) };
  }
}

export async function addIssueCommentAction(issueId: string, formData: FormData) {
  const { organization, user } = await requireOrg();
  const issue = await db.issue.findFirst({
    where: { id: issueId, deletedAt: null, project: { organizationId: organization.id } },
  });
  if (!issue) return { error: "Issue not found." };

  try {
    const parsed = commentSchema.parse({ body: formData.get("body") });
    await db.comment.create({
      data: { issueId, authorId: user.id, body: parsed.body },
    });
    revalidatePath(`/projects/${issue.projectId}`);
    return { ok: true };
  } catch (error) {
    return { error: formError(error) };
  }
}

export async function createTaskAction(_: unknown, formData: FormData) {
  const { organization, user } = await requireOrg();

  try {
    const parsed = taskSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      assigneeId: formData.get("assigneeId"),
      dueDate: formData.get("dueDate"),
      issueId: formData.get("issueId"),
      projectId: formData.get("projectId"),
    });

    const project = await db.project.findFirst({
      where: { id: parsed.projectId, organizationId: organization.id, deletedAt: null },
    });
    if (!project) return { error: "Project not found." };

    await db.task.create({
      data: {
        projectId: project.id,
        createdById: user.id,
        title: parsed.title,
        description: parsed.description ?? "",
        assigneeId: parsed.assigneeId || null,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        issueId: parsed.issueId || null,
      },
    });

    await logActivity({
      organizationId: organization.id,
      projectId: project.id,
      actorId: user.id,
      kind: "TASK_CREATED",
      message: `${user.name} created task “${parsed.title}”`,
    });

    revalidatePath("/tasks");
    revalidatePath(`/projects/${project.id}`);
    return { ok: true };
  } catch (error) {
    return { error: formError(error) };
  }
}

export async function updateTaskStatusAction(taskId: string, status: "TODO" | "IN_PROGRESS" | "DONE") {
  const { organization } = await requireOrg();
  const task = await db.task.findFirst({
    where: { id: taskId, deletedAt: null, project: { organizationId: organization.id } },
  });
  if (!task) return { error: "Task not found." };

  await db.task.update({ where: { id: task.id }, data: { status } });
  revalidatePath("/tasks");
  revalidatePath(`/projects/${task.projectId}`);
  return { ok: true };
}
