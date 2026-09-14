import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const DEMO_PASSWORD = "demo1234";

export async function ensureDemoUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const ava = await db.user.upsert({
    where: { email: "demo@geodraftly.app" },
    update: { passwordHash, name: "Ava Chen" },
    create: { email: "demo@geodraftly.app", name: "Ava Chen", passwordHash },
  });
  const marcus = await db.user.upsert({
    where: { email: "marcus@geodraftly.app" },
    update: { passwordHash, name: "Marcus Hale" },
    create: { email: "marcus@geodraftly.app", name: "Marcus Hale", passwordHash },
  });
  const jordan = await db.user.upsert({
    where: { email: "client@geodraftly.app" },
    update: { passwordHash, name: "Jordan Hale" },
    create: { email: "client@geodraftly.app", name: "Jordan Hale", passwordHash },
  });

  const org = await db.organization.upsert({
    where: { slug: "northridge-studio" },
    update: {},
    create: {
      name: "Northridge Studio",
      slug: "northridge-studio",
      legalName: "Northridge Civil & Landscape, Ltd.",
    },
  });

  await db.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: ava.id } },
    update: { role: "OWNER" },
    create: { organizationId: org.id, userId: ava.id, role: "OWNER" },
  });
  await db.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: marcus.id } },
    update: { role: "MEMBER" },
    create: { organizationId: org.id, userId: marcus.id, role: "MEMBER" },
  });
  await db.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: jordan.id } },
    update: { role: "CLIENT" },
    create: { organizationId: org.id, userId: jordan.id, role: "CLIENT" },
  });
}
