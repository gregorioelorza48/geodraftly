import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth/credentials";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.parse({
      email: String(body.email ?? "").toLowerCase().trim(),
      password: body.password,
    });
    const result = await authenticateUser(parsed.email, parsed.password);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    return NextResponse.json({ user: result.user, sessionToken: "cookie" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not sign in.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
