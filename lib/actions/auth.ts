"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { requireUser } from "@/lib/auth";
import { consumePasswordReset, createPasswordReset, originFromHeaders } from "@/lib/auth/password-reset";
import { db } from "@/lib/db";
import { createSession, destroySession, setActiveOrg } from "@/lib/session";
import { slugify } from "@/lib/utils";
import { formError, inviteSchema, loginSchema, organizationSchema, resetPasswordSchema, resetRequestSchema, signupSchema } from "@/lib/validations";

async function uniqueSlug(name: string) {
  const base = slugify(name) || "firm";
  let slug = base;
  let i = 2;
  while (await db.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
}

export async function signupAction(_: unknown, formData: FormData) {
  try {
    const parsed = signupSchema.parse({
      name: formData.get("name"),
      email: String(formData.get("email") ?? "").toLowerCase().trim(),
      password: formData.get("password"),
      organizationName: formData.get("organizationName"),
    });

    const existing = await db.user.findUnique({ where: { email: parsed.email } });
    if (existing) return { error: "An account with that email already exists." };

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const slug = await uniqueSlug(parsed.organizationName);

    const user = await db.user.create({
      data: { name: parsed.name, email: parsed.email, passwordHash },
    });

    const organization = await db.organization.create({
      data: { name: parsed.organizationName, slug },
    });

    await db.organizationMember.create({
      data: { organizationId: organization.id, userId: user.id, role: "OWNER" },
    });

    await db.reportTemplate.create({
      data: {
        organizationId: organization.id,
        name: "Site Observation Report",
        isDefault: true,
        headerNote: "This report documents existing conditions and field observations.",
        footerNote: "Confidential — for project use only.",
      },
    });

    await logActivity({
      organizationId: organization.id,
      actorId: user.id,
      kind: "MEMBER_ADDED",
      message: `${user.name} created ${organization.name}`,
    });

    await createSession({ userId: user.id, email: user.email, name: user.name });
    await setActiveOrg(organization.id);
  } catch (error) {
    return { error: formError(error) };
  }

  redirect("/dashboard");
}

export async function loginAction(_: unknown, formData: FormData) {
  try {
    const parsed = loginSchema.parse({
      email: String(formData.get("email") ?? "").toLowerCase().trim(),
      password: formData.get("password"),
    });

    const user = await db.user.findFirst({
      where: { email: parsed.email, deletedAt: null },
      include: { memberships: true },
    });
    if (!user) return { error: "Invalid email or password." };

    const ok = await bcrypt.compare(parsed.password, user.passwordHash);
    if (!ok) return { error: "Invalid email or password." };

    await createSession({ userId: user.id, email: user.email, name: user.name });
    if (user.memberships[0]) await setActiveOrg(user.memberships[0].organizationId);
  } catch (error) {
    return { error: formError(error) };
  }

  const next = String(formData.get("next") || "/dashboard");
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function requestResetAction(_: unknown, formData: FormData) {
  try {
    const parsed = resetRequestSchema.parse({
      email: String(formData.get("email") ?? "").toLowerCase().trim(),
    });
    const origin = originFromHeaders(await headers());
    const result = await createPasswordReset(parsed.email, origin);
    return {
      ok: true,
      message: "If that email is on file, you can use the reset link below. No mailer is configured yet.",
      resetUrl: result.resetUrl,
    };
  } catch (error) {
    return { error: formError(error) };
  }
}

export async function resetPasswordAction(_: unknown, formData: FormData) {
  try {
    const parsed = resetPasswordSchema.parse({
      token: formData.get("token"),
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });
    await consumePasswordReset(parsed.token, parsed.password);
  } catch (error) {
    return { error: formError(error) };
  }
  redirect("/login?reset=1");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function updateOrganizationAction(_: unknown, formData: FormData) {
  const { organization, membership } = await (await import("@/lib/auth")).requireOrg();
  if (membership.role === "MEMBER") return { error: "Only owners and admins can edit firm settings." };

  try {
    const parsed = organizationSchema.parse({
      name: formData.get("name"),
      legalName: formData.get("legalName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      website: formData.get("website"),
      address: formData.get("address"),
    });

    await db.organization.update({
      where: { id: organization.id },
      data: {
        name: parsed.name,
        legalName: parsed.legalName || null,
        email: parsed.email || null,
        phone: parsed.phone || null,
        website: parsed.website || null,
        address: parsed.address || null,
      },
    });
    return { ok: true };
  } catch (error) {
    return { error: formError(error) };
  }
}

export async function inviteMemberAction(_: unknown, formData: FormData) {
  const { organization, user, membership } = await (await import("@/lib/auth")).requireOrg();
  if (membership.role === "MEMBER") return { error: "Only owners and admins can invite teammates." };

  try {
    const parsed = inviteSchema.parse({
      name: formData.get("name"),
      email: String(formData.get("email") ?? "").toLowerCase().trim(),
      role: formData.get("role"),
    });

    let invitee = await db.user.findUnique({ where: { email: parsed.email } });
    if (!invitee) {
      if (!parsed.password) {
        return { error: "Set a password for new teammates so they can sign in." };
      }
      const passwordHash = await bcrypt.hash(parsed.password, 12);
      invitee = await db.user.create({
        data: { name: parsed.name, email: parsed.email, passwordHash },
      });
    }

    await db.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: organization.id, userId: invitee.id } },
      update: { role: parsed.role },
      create: { organizationId: organization.id, userId: invitee.id, role: parsed.role },
    });

    await logActivity({
      organizationId: organization.id,
      actorId: user.id,
      kind: "MEMBER_ADDED",
      message: `${user.name} added ${invitee.name} to the firm`,
    });

    return { ok: true };
  } catch (error) {
    return { error: formError(error) };
  }
}

export async function switchOrgAction(organizationId: string) {
  const { memberships } = await requireUser();
  if (!memberships.some((m) => m.organizationId === organizationId)) {
    return { error: "You do not belong to that organization." };
  }
  await setActiveOrg(organizationId);
  redirect("/dashboard");
}
