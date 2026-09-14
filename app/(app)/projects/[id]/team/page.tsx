import { assertProjectAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { addProjectMemberAction } from "@/lib/actions/projects";
import { Card } from "@/components/ui";
import { FormSubmit } from "@/components/form-submit";
import { InviteClientForm } from "@/components/invite-client-form";

export default async function ProjectTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project, isClient } = await assertProjectAccess(id);
  const [assigned, firm] = await Promise.all([
    db.projectMember.findMany({ where: { projectId: id }, include: { user: true } }),
    db.organizationMember.findMany({
      where: { organizationId: project.organizationId },
      include: { user: true },
    }),
  ]);

  const assignedIds = new Set(assigned.map((m) => m.userId));
  const available = firm.filter((m) => !assignedIds.has(m.userId) && m.role !== "CLIENT");
  const add = addProjectMemberAction.bind(null, id);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="mb-4 font-serif text-xl">On this project</h2>
        <ul className="space-y-3">
          {assigned.map((m) => (
            <li key={m.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{m.user.name}</p>
                <p className="text-sm text-ink-soft">{m.user.email}</p>
              </div>
              <p className="text-xs uppercase tracking-[0.12em] text-ink-soft">{m.role}</p>
            </li>
          ))}
        </ul>
      </Card>
      {isClient ? null : (
        <>
          <Card>
            <h2 className="mb-4 font-serif text-xl">Add from the firm</h2>
            {available.length === 0 ? (
              <p className="text-sm text-ink-soft">Everyone in the firm is already on this project.</p>
            ) : (
              <form
                action={async (data) => {
                  "use server";
                  await add(data);
                }}
                className="space-y-3"
              >
                <select name="userId" className="h-11 w-full rounded-lg border border-line bg-white px-3" required>
                  {available.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
                <select name="role" className="h-11 w-full rounded-lg border border-line bg-white px-3" defaultValue="MEMBER">
                  <option value="LEAD">Lead</option>
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <FormSubmit>Add to project</FormSubmit>
              </form>
            )}
          </Card>
          <Card className="lg:col-span-2">
            <h2 className="mb-2 font-serif text-xl">Invite a client</h2>
            <p className="mb-4 text-sm text-ink-soft">
              Clients can view this project and comment live on photographs and the map. They cannot edit visits or settings.
            </p>
            <InviteClientForm projectId={id} />
          </Card>
        </>
      )}
    </div>
  );
}
