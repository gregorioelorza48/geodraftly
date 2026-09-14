import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { setActiveOrg } from "@/lib/session";
import { slugify } from "@/lib/utils";

export default async function OnboardingPage() {
  const { user, membership } = await requireUser();
  if (membership) redirect("/dashboard");

  async function createFirm(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    if (name.length < 2) return;
    let slug = slugify(name) || "firm";
    let i = 2;
    while (await db.organization.findUnique({ where: { slug } })) {
      slug = `${slugify(name)}-${i}`;
      i += 1;
    }
    const org = await db.organization.create({ data: { name, slug } });
    await db.organizationMember.create({ data: { organizationId: org.id, userId: user.id, role: "OWNER" } });
    await db.reportTemplate.create({
      data: { organizationId: org.id, name: "Site Observation Report", isDefault: true },
    });
    await setActiveOrg(org.id);
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form action={createFirm} className="w-full max-w-md space-y-4 rounded-2xl border border-line bg-white p-8">
        <h1 className="font-serif text-3xl">Create a firm</h1>
        <p className="text-sm text-ink-soft">Your account is not attached to an organization yet.</p>
        <input name="name" required className="h-11 w-full rounded-lg border border-line px-3" placeholder="Firm name" />
        <button type="submit" className="h-11 rounded-lg bg-field px-4 text-sm font-semibold text-white">
          Continue
        </button>
      </form>
    </div>
  );
}
