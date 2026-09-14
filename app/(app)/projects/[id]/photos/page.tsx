import { PhotoCollab } from "@/components/photo-collab";
import { EmptyState } from "@/components/ui";
import { assertProjectAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFileUrl } from "@/lib/storage";

export default async function ProjectPhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await assertProjectAccess(id);
  const photos = await db.photo.findMany({
    where: { projectId: id, deletedAt: null },
    include: { observation: true },
    orderBy: { createdAt: "desc" },
  });
  const items = await Promise.all(
    photos.map(async (p) => ({
      id: p.id,
      url: await getFileUrl(p.fileKey),
      caption: p.caption || p.observation?.title || "Site photo",
    })),
  );

  if (items.length === 0) {
    return (
      <EmptyState
        title="No photographs"
        body="Upload photos on a site visit, then team members and invited clients can pin live comments on them."
      />
    );
  }

  return <PhotoCollab projectId={id} photos={items} currentUserId={user.id} />;
}
