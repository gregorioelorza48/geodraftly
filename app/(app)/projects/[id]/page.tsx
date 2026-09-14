import Link from "next/link";
import { format } from "date-fns";
import { assertProjectAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui";
import { IssueStatusBadge, VisitStatusBadge } from "@/components/status-badge";
import { formatAddress } from "@/lib/utils";

export default async function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project, isClient } = await assertProjectAccess(id);

  const [visits, issues, observations] = await Promise.all([
    db.siteVisit.findMany({
      where: { projectId: id, deletedAt: null },
      include: { observer: true, _count: { select: { observations: true } } },
      orderBy: { visitedAt: "desc" },
      take: 5,
    }),
    db.issue.findMany({
      where: { projectId: id, deletedAt: null, status: { in: ["OPEN", "IN_PROGRESS"] } },
      include: { assignee: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.observation.count({ where: { projectId: id, deletedAt: null } }),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Site</p>
          <p className="mt-2 font-medium">{formatAddress(project)}</p>
          {project.description ? <p className="mt-3 text-sm leading-6 text-ink-soft">{project.description}</p> : null}
          <div className="mt-4 flex flex-wrap gap-3">
            {isClient ? null : (
              <Link href={`/projects/${id}/visits/new`} className="inline-flex h-11 items-center rounded-lg bg-field px-4 text-sm font-semibold text-white">
                New site visit
              </Link>
            )}
            <Link href={`/projects/${id}/map`} className="inline-flex h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold">
              Open map
            </Link>
            <Link href={`/projects/${id}/photos`} className="inline-flex h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold">
              Comment on photos
            </Link>
          </div>
        </Card>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-xl">Recent visits</h2>
            <Link href={`/projects/${id}/visits`} className="text-sm font-medium text-field">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {visits.length === 0 ? <Card>No site visits yet.</Card> : null}
            {visits.map((visit) => (
              <Link key={visit.id} href={`/projects/${id}/visits/${visit.id}`}>
                <Card className="flex items-center justify-between hover:border-field/30">
                  <div>
                    <p className="font-medium">{format(visit.visitedAt, "MMMM d, yyyy")}</p>
                    <p className="text-sm text-ink-soft">
                      {visit.observer.name} · {visit._count.observations} observations
                    </p>
                  </div>
                  <VisitStatusBadge value={visit.status} />
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Record</p>
          <p className="mt-3 font-serif text-3xl">{observations}</p>
          <p className="text-sm text-ink-soft">observations on this project</p>
        </Card>
        <div>
          <h2 className="mb-3 font-serif text-xl">Open issues</h2>
          <div className="space-y-3">
            {issues.length === 0 ? <Card>Punch list is clear.</Card> : null}
            {issues.map((issue) => (
              <Card key={issue.id}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{issue.title}</p>
                  <IssueStatusBadge value={issue.status} />
                </div>
                <p className="mt-1 text-sm text-ink-soft">{issue.assignee?.name ?? "Unassigned"}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
