import { CreateVisitForm } from "@/components/action-forms";
import { Card } from "@/components/ui";
import { assertProjectAccess } from "@/lib/auth";

export default async function NewVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await assertProjectAccess(id);
  return (
    <Card>
      <h2 className="mb-4 font-serif text-2xl">Start a site visit</h2>
      <CreateVisitForm projectId={id} />
    </Card>
  );
}
