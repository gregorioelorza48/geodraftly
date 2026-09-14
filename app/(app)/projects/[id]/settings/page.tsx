import { EditProjectForm } from "@/components/action-forms";
import { Card } from "@/components/ui";
import { assertProjectAccess } from "@/lib/auth";

export default async function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project } = await assertProjectAccess(id);
  return (
    <Card>
      <h2 className="mb-4 font-serif text-2xl">Project settings</h2>
      <EditProjectForm project={project} />
    </Card>
  );
}
