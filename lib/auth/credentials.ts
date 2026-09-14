import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ensureDemoUsers } from "@/lib/auth/ensure-demo";
import { createSession, setActiveOrg } from "@/lib/session";

const DEMO_EMAILS = new Set(["demo@geodraftly.app", "marcus@geodraftly.app", "client@geodraftly.app"]);

export async function authenticateUser(email: string, password: string) {
  const normalized = email.toLowerCase().trim();

  if (DEMO_EMAILS.has(normalized) && password === "demo1234") {
    try {
      await ensureDemoUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create demo users.";
      return { error: message };
    }
  }

  const user = await db.user.findFirst({
    where: { email: normalized, deletedAt: null },
    include: { memberships: true },
  });
  if (!user) return { error: "Invalid email or password." as const };

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "Invalid email or password." as const };

  await createSession({ userId: user.id, email: user.email, name: user.name });
  if (user.memberships[0]) await setActiveOrg(user.memberships[0].organizationId);

  return {
    user: { id: user.id, email: user.email, name: user.name, provider: "cookie" as const },
  };
}
