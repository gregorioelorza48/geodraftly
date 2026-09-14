import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscribeProject, type CollabEvent } from "@/lib/collab";
import { createPinCommentAction, listPinComments } from "@/lib/actions/collab";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize(projectId: string) {
  const current = await getCurrentUser();
  if (!current?.membership) return null;
  const project = await db.project.findFirst({
    where: { id: projectId, organizationId: current.membership.organizationId, deletedAt: null },
  });
  if (!project) return null;
  if (current.membership.role === "CLIENT") {
    const assigned = await db.projectMember.findFirst({
      where: { projectId, userId: current.user.id },
    });
    if (!assigned) return null;
  }
  return current;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = await authorize(id);
  if (!current) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  if (searchParams.get("history") === "1") {
    const comments = await listPinComments(id);
    return NextResponse.json({ comments });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      send({ type: "hello" });
      const unsubscribe = subscribeProject(id, (event: CollabEvent) => send(event));
      const heartbeat = setInterval(() => send({ type: "ping" }), 15000);
      const close = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = await authorize(id);
  if (!current) return new NextResponse("Unauthorized", { status: 401 });
  const body = await request.json();
  const result = await createPinCommentAction(id, body);
  if ("error" in result && result.error) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
