import { CreateProjectForm } from "@/components/action-forms";
import { Card, PageHeader } from "@/components/ui";

export default function NewProjectPage() {
  return (
    <>
      <PageHeader title="New project" description="Job number, client, and site location — the rest can wait." />
      <Card>
        <CreateProjectForm />
      </Card>
    </>
  );
}
