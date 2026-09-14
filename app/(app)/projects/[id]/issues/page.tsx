import { assertProjectAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, EmptyState } from "@/components/ui";
import { CreateIssueForm } from "@/components/action-forms";
import { IssueStatusBadge, PriorityBadge } from "@/components/status-badge";
import { format } from "date-fns";

export default async function ProjectIssuesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project } = await assertProjectAccess(id);
  const [issues, members] = await Promise.all([
    db.issue.findMany({
      where: { projectId: id, deletedAt: null },
      include: { assignee: true, createdBy: true },
      orderBy: { createdAt: "desc" },
    }),
    db.organizationMember.findMany({
      where: { organizationId: project.organizationId },
      include: { user: true },
    }),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {issues.length === 0 ? (
          <EmptyState title="Punch list is empty" body="Open items as you walk the site. Assign an owner and a due date." />
        ) : (
          issues.map((issue) => (
            <Card key={issue.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-xl">{issue.title}</p>
                  <p className="text-sm text-ink-soft">
                    {issue.assignee?.name ?? "Unassigned"}
                    {issue.dueDate ? ` · due ${format(issue.dueDate, "MMM d, yyyy")}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <PriorityBadge value={issue.priority} />
                  <IssueStatusBadge value={issue.status} />
                </div>
              </div>
              {issue.description ? <p className="mt-2 text-sm text-ink-soft">{issue.description}</p> : null}
            </Card>
          ))
        )}
      </div>
      <Card>
        <h2 className="mb-4 font-serif text-xl">New punch item</h2>
        <CreateIssueForm
          projectId={id}
          members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
        />
      </Card>
    </div>
  );
}
