import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const TTL_MS = 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordReset(email: string, origin: string) {
  const user = await db.user.findFirst({
    where: { email: email.toLowerCase().trim(), deletedAt: null },
  });
  if (!user) return { ok: true as const };

  const raw = randomBytes(32).toString("hex");
  await db.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });

  // TODO: Send this URL with Resend / SendGrid / Postmark instead of returning it.
  return { ok: true as const, resetUrl: `${origin}/reset-password?token=${raw}` };
}

export async function consumePasswordReset(token: string, password: string) {
  const row = await db.passwordResetToken.findFirst({
    where: { tokenHash: hashToken(token), usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!row) throw new Error("This reset link is invalid or has expired.");

  const passwordHash = await bcrypt.hash(password, 12);
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);
}

export function originFromHeaders(headerList: Headers) {
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
