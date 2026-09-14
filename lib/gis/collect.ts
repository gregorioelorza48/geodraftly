import { db } from "@/lib/db";
import type { InterchangePoint } from "@/lib/gis/points";

export async function collectProjectPoints(projectId: string): Promise<InterchangePoint[]> {
  const [project, observations, comments, survey] = await Promise.all([
    db.project.findFirstOrThrow({ where: { id: projectId } }),
    db.observation.findMany({
      where: { projectId, deletedAt: null, latitude: { not: null }, longitude: { not: null } },
      orderBy: { recordedAt: "asc" },
    }),
    db.pinComment.findMany({
      where: {
        projectId,
        deletedAt: null,
        kind: "MAP",
        parentId: null,
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.surveyPoint.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
  ]);

  const points: InterchangePoint[] = [];
  let n = 1;

  if (project.latitude != null && project.longitude != null) {
    points.push({
      pointNumber: String(n),
      latitude: project.latitude,
      longitude: project.longitude,
      elevation: null,
      description: `${project.number} ${project.name} — site`,
      category: "PROJECT",
      source: "project",
      recordedAt: project.createdAt.toISOString(),
      geodraftlyId: `project:${project.id}`,
    });
    n += 1;
  }

  for (const obs of observations) {
    points.push({
      pointNumber: String(n),
      latitude: obs.latitude as number,
      longitude: obs.longitude as number,
      elevation: null,
      description: obs.title,
      category: obs.category,
      source: "observation",
      recordedAt: obs.recordedAt.toISOString(),
      geodraftlyId: `observation:${obs.id}`,
    });
    n += 1;
  }

  for (const comment of comments) {
    points.push({
      pointNumber: String(n),
      latitude: comment.latitude as number,
      longitude: comment.longitude as number,
      elevation: null,
      description: comment.body.slice(0, 80),
      category: "DISCUSSION",
      source: "discussion",
      recordedAt: comment.createdAt.toISOString(),
      geodraftlyId: `comment:${comment.id}`,
    });
    n += 1;
  }

  for (const pt of survey) {
    points.push({
      pointNumber: pt.pointNumber || String(n),
      latitude: pt.latitude,
      longitude: pt.longitude,
      elevation: pt.elevation,
      description: pt.description,
      category: pt.category || "CIVIL3D",
      source: "civil3d",
      recordedAt: pt.createdAt.toISOString(),
      geodraftlyId: `survey:${pt.id}`,
    });
    n += 1;
  }

  return points;
}
