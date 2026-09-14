import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: current.user.id,
      email: current.user.email,
      name: current.user.name,
      provider: "cookie",
    },
    sessionToken: "cookie",
  });
}
