import Link from "next/link";
import { format } from "date-fns";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { IssueStatusBadge, PriorityBadge } from "@/components/status-badge";

export default async function IssuesPage() {
  const { organization } = await requireOrg();
  const issues = await db.issue.findMany({
    where: { deletedAt: null, project: { organizationId: organization.id, deletedAt: null } },
    include: { project: true, assignee: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <>
      <PageHeader title="Issues" description="Punch items across every project." />
      {issues.length === 0 ? (
        <EmptyState title="No punch items" body="Issues created during site visits collect here." />
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <Link key={issue.id} href={`/projects/${issue.projectId}/issues`}>
              <Card className="flex flex-wrap items-start justify-between gap-3 hover:border-field/30">
                <div>
                  <p className="text-xs text-ink-soft">{issue.project.number} · {issue.project.name}</p>
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
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
