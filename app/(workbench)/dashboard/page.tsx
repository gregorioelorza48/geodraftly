import { WorkbenchLoader } from "@/components/workbench/workbench-loader";
import { getCurrentUser, visibleProjectWhere } from "@/lib/auth";
import { db } from "@/lib/db";
import type { DesignProject } from "@/lib/design/types";

const LOCAL_DRAFT: DesignProject = {
  id: "local-draft",
  name: "Untitled site",
  number: "DRAFT",
  latitude: 42.0412,
  longitude: -87.673,
};

export default async function DashboardPage() {
  const current = await getCurrentUser();
  const membership = current?.membership;
  const projects = membership
    ? await db.project.findMany({
        where: visibleProjectWhere(membership.organizationId, current.user.id, membership.role),
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, number: true, latitude: true, longitude: true },
      })
    : [LOCAL_DRAFT];

  return <WorkbenchLoader projects={projects.length ? projects : [LOCAL_DRAFT]} />;
}
