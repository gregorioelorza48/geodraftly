import { NextResponse } from "next/server";
import { consumePasswordReset } from "@/lib/auth/password-reset";
import { formError, resetPasswordSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.parse({
      token: body.token,
      password: body.password,
      confirm: body.confirm,
    });
    await consumePasswordReset(parsed.token, parsed.password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: formError(error) }, { status: 400 });
  }
}
