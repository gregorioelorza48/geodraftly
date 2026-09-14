import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { CreateTaskForm, TaskStatusForm } from "@/components/task-form";
import { format } from "date-fns";

export default async function TasksPage() {
  const { organization } = await requireOrg();
  const [tasks, projects, members] = await Promise.all([
    db.task.findMany({
      where: { deletedAt: null, project: { organizationId: organization.id, deletedAt: null } },
      include: { project: true, assignee: true },
      orderBy: { createdAt: "desc" },
    }),
    db.project.findMany({
      where: { organizationId: organization.id, deletedAt: null },
      select: { id: true, name: true, number: true },
      orderBy: { name: "asc" },
    }),
    db.organizationMember.findMany({
      where: { organizationId: organization.id },
      include: { user: true },
    }),
  ]);

  return (
    <>
      <PageHeader title="Tasks" description="Follow-up work that came out of the field." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <EmptyState title="No tasks" body="Create a follow-up from a punch item or a visit note." />
          ) : (
            tasks.map((task) => (
              <Card key={task.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-ink-soft">{task.project.number}</p>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-sm text-ink-soft">
                    {task.assignee?.name ?? "Unassigned"}
                    {task.dueDate ? ` · ${format(task.dueDate, "MMM d")}` : ""}
                  </p>
                </div>
                <TaskStatusForm taskId={task.id} status={task.status as "TODO" | "IN_PROGRESS" | "DONE"} />
              </Card>
            ))
          )}
        </div>
        <Card>
          <h2 className="mb-4 font-serif text-xl">New task</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-ink-soft">Create a project first.</p>
          ) : (
            <CreateTaskForm
              projects={projects}
              members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
            />
          )}
        </Card>
      </div>
    </>
  );
}
