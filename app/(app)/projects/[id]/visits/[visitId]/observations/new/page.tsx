import { ObservationForm } from "@/components/observation-form";
import { Card } from "@/components/ui";
import { assertProjectAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function NewObservationPage({
  params,
}: {
  params: Promise<{ id: string; visitId: string }>;
}) {
  const { id, visitId } = await params;
  const { project } = await assertProjectAccess(id);
  const visit = await db.siteVisit.findFirst({ where: { id: visitId, projectId: id, deletedAt: null } });
  if (!visit) notFound();

  const center =
    project.latitude != null && project.longitude != null
      ? ([project.latitude, project.longitude] as [number, number])
      : undefined;

  return (
    <Card>
      <h2 className="mb-2 font-serif text-2xl">New observation</h2>
      <p className="mb-6 text-sm text-ink-soft">
        Write what you saw, attach photos, and pin it on the site. Large touch targets for tablet use.
      </p>
      <ObservationForm visitId={visit.id} defaultCenter={center} />
    </Card>
  );
}
