import Link from "next/link";
import { format } from "date-fns";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { VisitStatusBadge } from "@/components/status-badge";

export default async function VisitsPage() {
  const { organization } = await requireOrg();
  const visits = await db.siteVisit.findMany({
    where: { deletedAt: null, project: { organizationId: organization.id, deletedAt: null } },
    include: { project: true, observer: true, _count: { select: { observations: true } } },
    orderBy: { visitedAt: "desc" },
  });

  return (
    <>
      <PageHeader title="Site visits" description="The firm-wide field log." />
      {visits.length === 0 ? (
        <EmptyState title="No visits yet" body="Open a project and start a site visit from the field." />
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => (
            <Link key={visit.id} href={`/projects/${visit.projectId}/visits/${visit.id}`}>
              <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between hover:border-field/30">
                <div>
                  <p className="text-xs text-ink-soft">{visit.project.number}</p>
                  <p className="font-serif text-xl">{visit.project.name}</p>
                  <p className="text-sm text-ink-soft">
                    {format(visit.visitedAt, "MMM d, yyyy")} · {visit.observer.name} · {visit._count.observations} observations
                  </p>
                </div>
                <VisitStatusBadge value={visit.status} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
