import Link from "next/link";
import { requireOrg, visibleProjectWhere } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { ProjectStatusBadge } from "@/components/status-badge";
import { PROJECT_TYPE_LABELS, getLabel } from "@/lib/labels";

export default async function ProjectsPage() {
  const { organization, user, membership, isClient } = await requireOrg();
  const projects = await db.project.findMany({
    where: visibleProjectWhere(organization.id, user.id, membership.role),
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { siteVisits: true, issues: true } } },
  });

  return (
    <>
      <PageHeader
        title="Projects"
        description={isClient ? "Projects shared with you for review and comment." : "Every job the firm is documenting in the field."}
        actions={
          isClient ? undefined : (
            <Link href="/projects/new" className="inline-flex h-11 items-center rounded-lg bg-field px-4 text-sm font-semibold text-white">
              New project
            </Link>
          )
        }
      />
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body="Create a project to start logging site visits, observations, and punch items."
          action={
            isClient ? undefined : (
              <Link href="/projects/new" className="inline-flex h-11 items-center rounded-lg bg-field px-4 text-sm font-semibold text-white">
                Create the first project
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:border-field/30">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-ink-soft">{project.number}</p>
                  <p className="font-serif text-xl">{project.name}</p>
                  <p className="text-sm text-ink-soft">
                    {project.client} · {getLabel(PROJECT_TYPE_LABELS, project.type)}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-ink-soft">
                  <span>{project._count.siteVisits} visits</span>
                  <span>{project._count.issues} issues</span>
                  <ProjectStatusBadge value={project.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
