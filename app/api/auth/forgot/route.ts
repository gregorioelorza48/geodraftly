import { NextResponse } from "next/server";
import { createPasswordReset, originFromHeaders } from "@/lib/auth/password-reset";
import { formError, resetRequestSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetRequestSchema.parse({
      email: String(body.email ?? "").toLowerCase().trim(),
    });
    const origin = originFromHeaders(new Headers(request.headers));
    const result = await createPasswordReset(parsed.email, origin);
    return NextResponse.json({
      ok: true,
      message: "If that email is on file, you can use the reset link below. No mailer is configured yet.",
      resetUrl: result.resetUrl,
    });
  } catch (error) {
    return NextResponse.json({ error: formError(error) }, { status: 400 });
  }
}
