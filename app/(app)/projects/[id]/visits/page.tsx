import Link from "next/link";
import { format } from "date-fns";
import { assertProjectAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, EmptyState } from "@/components/ui";
import { VisitStatusBadge } from "@/components/status-badge";

export default async function ProjectVisitsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await assertProjectAccess(id);
  const visits = await db.siteVisit.findMany({
    where: { projectId: id, deletedAt: null },
    include: { observer: true, _count: { select: { observations: true, photos: true } } },
    orderBy: { visitedAt: "desc" },
  });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Link href={`/projects/${id}/visits/new`} className="inline-flex h-11 items-center rounded-lg bg-field px-4 text-sm font-semibold text-white">
          New site visit
        </Link>
      </div>
      {visits.length === 0 ? (
        <EmptyState
          title="No site visits"
          body="Start a visit to capture weather, notes, photographs, and observations."
          action={
            <Link href={`/projects/${id}/visits/new`} className="inline-flex h-11 items-center rounded-lg bg-field px-4 text-sm font-semibold text-white">
              Start a visit
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => (
            <Link key={visit.id} href={`/projects/${id}/visits/${visit.id}`}>
              <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between hover:border-field/30">
                <div>
                  <p className="font-serif text-xl">{format(visit.visitedAt, "MMMM d, yyyy")}</p>
                  <p className="text-sm text-ink-soft">
                    {visit.observer.name}
                    {visit.weather ? ` · ${visit.weather}` : ""}
                    {visit.temperatureF != null ? ` · ${visit.temperatureF}°F` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-ink-soft">
                  <span>{visit._count.observations} observations</span>
                  <span>{visit._count.photos} photos</span>
                  <VisitStatusBadge value={visit.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
