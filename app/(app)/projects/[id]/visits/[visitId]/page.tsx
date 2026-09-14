import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import { assertProjectAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui";
import { ObservationStatusBadge, PriorityBadge } from "@/components/status-badge";
import { VisitEditor } from "@/components/visit-editor";
import { CreateIssueForm, GenerateReportButton } from "@/components/action-forms";
import { CATEGORY_LABELS, getLabel } from "@/lib/labels";
import { getFileUrl } from "@/lib/storage";

export default async function VisitDetailPage({
  params,
}: {
  params: Promise<{ id: string; visitId: string }>;
}) {
  const { id, visitId } = await params;
  const { project } = await assertProjectAccess(id);
  const visit = await db.siteVisit.findFirst({
    where: { id: visitId, projectId: id, deletedAt: null },
    include: {
      observer: true,
      observations: {
        where: { deletedAt: null },
        include: { photos: { where: { deletedAt: null } }, author: true },
        orderBy: { recordedAt: "asc" },
      },
      issues: { where: { deletedAt: null }, include: { assignee: true } },
      photos: { where: { deletedAt: null, observationId: null } },
    },
  });
  if (!visit) notFound();

  const members = await db.organizationMember.findMany({
    where: { organizationId: project.organizationId },
    include: { user: true },
  });
  const photoUrls = await Promise.all(
    visit.observations.flatMap((o) => o.photos).map(async (p) => [p.id, await getFileUrl(p.fileKey)] as const),
  );
  const urlById = Object.fromEntries(photoUrls);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-soft">
            {format(visit.visitedAt, "EEEE, MMMM d, yyyy · h:mm a")} · {visit.observer.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/projects/${id}/visits/${visitId}/observations/new`}
            className="inline-flex h-11 items-center rounded-lg bg-field px-4 text-sm font-semibold text-white"
          >
            Add observation
          </Link>
          <GenerateReportButton visitId={visit.id} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <h2 className="mb-4 font-serif text-2xl">Visit record</h2>
          <VisitEditor visit={visit} />
        </Card>
        <Card>
          <h2 className="mb-4 font-serif text-2xl">Punch items from this visit</h2>
          <div className="mb-4 space-y-2">
            {visit.issues.length === 0 ? <p className="text-sm text-ink-soft">None yet.</p> : null}
            {visit.issues.map((issue) => (
              <div key={issue.id} className="rounded-lg border border-line p-3">
                <p className="font-medium">{issue.title}</p>
                <p className="text-xs text-ink-soft">{issue.assignee?.name ?? "Unassigned"}</p>
              </div>
            ))}
          </div>
          <CreateIssueForm
            projectId={id}
            siteVisitId={visit.id}
            members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
          />
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-serif text-2xl">Observations</h2>
        {visit.observations.length === 0 ? (
          <Card>No observations yet. Capture the first condition while you are still on site.</Card>
        ) : (
          <div className="space-y-4">
            {visit.observations.map((obs, index) => (
              <Card key={obs.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-ink-soft">
                      {index + 1}. {getLabel(CATEGORY_LABELS, obs.category)}
                    </p>
                    <h3 className="font-serif text-xl">{obs.title}</h3>
                    <p className="mt-1 text-sm text-ink-soft">{obs.author.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <PriorityBadge value={obs.priority} />
                    <ObservationStatusBadge value={obs.status} />
                  </div>
                </div>
                {obs.description ? <p className="mt-3 text-sm leading-6">{obs.description}</p> : null}
                {obs.latitude != null && obs.longitude != null ? (
                  <p className="mt-2 text-xs text-ink-soft">
                    {obs.latitude.toFixed(5)}, {obs.longitude.toFixed(5)}
                  </p>
                ) : null}
                {obs.photos.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {obs.photos.map((photo) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={photo.id}
                        src={urlById[photo.id]}
                        alt={photo.caption || obs.title}
                        className="h-28 w-full rounded-lg object-cover"
                      />
                    ))}
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
