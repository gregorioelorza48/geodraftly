import Link from "next/link";
import { format } from "date-fns";
import { assertProjectAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, EmptyState } from "@/components/ui";
import { ObservationStatusBadge, PriorityBadge } from "@/components/status-badge";
import { CATEGORY_LABELS, getLabel } from "@/lib/labels";

export default async function ProjectObservationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await assertProjectAccess(id);
  const observations = await db.observation.findMany({
    where: { projectId: id, deletedAt: null },
    include: { author: true, siteVisit: true, _count: { select: { photos: true } } },
    orderBy: { recordedAt: "desc" },
  });

  return observations.length === 0 ? (
    <EmptyState title="No observations" body="Observations appear here after you log them during a site visit." />
  ) : (
    <div className="space-y-3">
      {observations.map((obs) => (
        <Link key={obs.id} href={`/projects/${id}/visits/${obs.siteVisitId}`}>
          <Card className="hover:border-field/30">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-ink-soft">{getLabel(CATEGORY_LABELS, obs.category)}</p>
                <p className="font-serif text-xl">{obs.title}</p>
                <p className="text-sm text-ink-soft">
                  {obs.author.name} · {format(obs.recordedAt, "MMM d, yyyy")} · {obs._count.photos} photos
                </p>
              </div>
              <div className="flex gap-2">
                <PriorityBadge value={obs.priority} />
                <ObservationStatusBadge value={obs.status} />
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
