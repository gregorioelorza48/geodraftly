import { redirect } from "next/navigation";
import { db } from "./db";
import { getActiveOrgId, getSession } from "./session";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await db.user.findFirst({
    where: { id: session.userId, deletedAt: null },
    include: {
      memberships: {
        include: { organization: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) return null;

  const memberships = user.memberships.filter((m) => !m.organization.deletedAt);
  const activeOrgId = await getActiveOrgId();
  const membership =
    memberships.find((m) => m.organizationId === activeOrgId) ?? memberships[0] ?? null;

  return { user, memberships, membership };
}

export async function requireUser() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  return current;
}

export async function requireOrg() {
  const current = await requireUser();
  if (!current.membership) redirect("/onboarding");
  return {
    user: current.user,
    membership: current.membership,
    organization: current.membership.organization,
    memberships: current.memberships,
    isClient: current.membership.role === "CLIENT",
  };
}

export function visibleProjectWhere(organizationId: string, userId: string, role: string) {
  const base = { organizationId, deletedAt: null as Date | null };
  if (role === "CLIENT") {
    return { ...base, members: { some: { userId } } };
  }
  return base;
}

export async function assertProjectAccess(projectId: string) {
  const { organization, user, membership, isClient } = await requireOrg();
  const project = await db.project.findFirst({
    where: { id: projectId, organizationId: organization.id, deletedAt: null },
  });
  if (!project) redirect("/projects");
  if (membership.role === "CLIENT") {
    const assigned = await db.projectMember.findFirst({
      where: { projectId: project.id, userId: user.id },
    });
    if (!assigned) redirect("/projects");
  }
  return { project, organization, user, membership, isClient };
}

export function assertStaff(role: string) {
  if (role === "CLIENT") {
    throw new Error("Client accounts can comment on photos and maps, but cannot edit the project record.");
  }
}
