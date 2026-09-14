import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { InviteForm } from "@/components/action-forms";

export default async function TeamPage() {
  const { organization } = await requireOrg();
  const members = await db.organizationMember.findMany({
    where: { organizationId: organization.id },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <PageHeader title="Team" description="People who can document work for this firm." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-serif text-xl">Members</h2>
          <ul className="space-y-4">
            {members.map((m) => (
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
        <Card>
          <h2 className="mb-4 font-serif text-xl">Invite</h2>
          <p className="mb-4 text-sm text-ink-soft">
            Existing users are added immediately. For a new email, set a password they can use to sign in.
          </p>
          <InviteForm />
        </Card>
      </div>
    </>
  );
}
