"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { assertProjectAccess, assertStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { formError } from "@/lib/validations";
import { parseCsv, parseGeoJson } from "@/lib/gis/points";

const MAX_POINTS = 5000;

export async function importPointsAction(projectId: string, formData: FormData) {
  const { user, membership, organization } = await assertProjectAccess(projectId);
  try {
    assertStaff(membership.role);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV or GeoJSON file." };
    if (file.size > 8 * 1024 * 1024) return { error: "File is too large (8 MB max)." };

    const name = file.name.toLowerCase();
    const text = await file.text();
    const parsed = name.endsWith(".geojson") || name.endsWith(".json") ? parseGeoJson(text) : parseCsv(text);
    if (parsed.length === 0) return { error: "No points found in that file." };
    if (parsed.length > MAX_POINTS) return { error: `Too many points (max ${MAX_POINTS}).` };

    await db.surveyPoint.createMany({
      data: parsed.map((point) => ({
        projectId,
        importedById: user.id,
        pointNumber: point.pointNumber.slice(0, 40),
        latitude: point.latitude,
        longitude: point.longitude,
        elevation: point.elevation,
        description: point.description.slice(0, 500),
        category: point.category.slice(0, 40),
        sourceFile: file.name.slice(0, 160),
      })),
    });

    await logActivity({
      organizationId: organization.id,
      projectId,
      actorId: user.id,
      kind: "SURVEY_IMPORT",
      message: `Imported ${parsed.length} survey point${parsed.length === 1 ? "" : "s"} from ${file.name}`,
    });

    revalidatePath(`/projects/${projectId}/map`);
    return { ok: true, count: parsed.length };
  } catch (error) {
    return { error: formError(error) };
  }
}

export async function clearImportedPointsAction(projectId: string) {
  const { user, membership, organization } = await assertProjectAccess(projectId);
  try {
    assertStaff(membership.role);
    const removed = await db.surveyPoint.deleteMany({ where: { projectId } });
    if (removed.count > 0) {
      await logActivity({
        organizationId: organization.id,
        projectId,
        actorId: user.id,
        kind: "SURVEY_CLEAR",
        message: `Cleared ${removed.count} imported survey point${removed.count === 1 ? "" : "s"}`,
      });
    }
    revalidatePath(`/projects/${projectId}/map`);
    return { ok: true };
  } catch (error) {
    return { error: formError(error) };
  }
}
