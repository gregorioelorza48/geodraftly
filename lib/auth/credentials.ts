import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, setActiveOrg } from "@/lib/session";

export async function authenticateUser(email: string, password: string) {
  const user = await db.user.findFirst({
    where: { email: email.toLowerCase().trim(), deletedAt: null },
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
