import { GisExchange } from "@/components/gis-exchange";
import { MapCollab } from "@/components/map-collab";
import { assertProjectAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui";
import { CATEGORY_LABELS, getLabel } from "@/lib/labels";

export default async function ProjectMapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project, isClient } = await assertProjectAccess(id);
  const [observations, survey] = await Promise.all([
    db.observation.findMany({
      where: { projectId: id, deletedAt: null, latitude: { not: null }, longitude: { not: null } },
      orderBy: { recordedAt: "desc" },
    }),
    db.surveyPoint.findMany({ where: { projectId: id }, orderBy: { createdAt: "asc" } }),
  ]);

  const observationPoints = observations.map((o) => ({
    id: o.id,
    lat: o.latitude as number,
    lng: o.longitude as number,
    title: o.title,
    subtitle: getLabel(CATEGORY_LABELS, o.category),
    href: `/projects/${id}/visits/${o.siteVisitId}`,
    kind: "observation" as const,
  }));

  const surveyPoints = survey.map((point) => ({
    id: point.id,
    lat: point.latitude,
    lng: point.longitude,
    title: point.pointNumber ? `Pt ${point.pointNumber}` : "Imported point",
    subtitle: [point.description, point.sourceFile].filter(Boolean).join(" · "),
    kind: "survey" as const,
  }));

  const center =
    project.latitude != null && project.longitude != null
      ? ([project.latitude, project.longitude] as [number, number])
      : undefined;

  const hasPins = observationPoints.length > 0 || surveyPoints.length > 0 || Boolean(center);
  if (!hasPins && isClient) {
    return (
      <EmptyState
        title="No mapped locations"
        body="The project team has not added a site location, observations, or imported survey points yet."
      />
    );
  }

  return (
    <div className="space-y-4">
      <GisExchange projectId={id} isClient={isClient} importedCount={survey.length} />
      {hasPins ? (
        <MapCollab
          projectId={id}
          observationPoints={observationPoints}
          surveyPoints={surveyPoints}
          center={center}
        />
      ) : (
        <EmptyState
          title="No mapped locations yet"
          body="Add a project lat/long in settings, drop pins when you log observations, or import a Civil 3D CSV / GeoJSON above."
        />
      )}
    </div>
  );
}
