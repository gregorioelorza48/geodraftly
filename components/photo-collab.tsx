"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { repliesFor, threadRoots, useProjectCollab } from "@/lib/hooks/use-project-collab";
import { cn, initials } from "@/lib/utils";
import { Button, Input } from "@/components/ui";

type PhotoItem = {
  id: string;
  url: string;
  caption: string;
};

export function PhotoCollab({
  projectId,
  photos,
  currentUserId,
}: {
  projectId: string;
  photos: PhotoItem[];
  currentUserId: string;
}) {
  const { photoComments, connected, post } = useProjectCollab(projectId);
  const [activeId, setActiveId] = useState(photos[0]?.id ?? null);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const active = photos.find((p) => p.id === activeId) ?? photos[0];
  const onPhoto = useMemo(
    () => photoComments.filter((c) => c.photoId === active?.id),
    [photoComments, active?.id],
  );
  const roots = threadRoots(onPhoto);

  async function submit(parentId?: string) {
    if (!active || !body.trim()) return;
    if (!parentId && !draft) {
      setError("Click the photo to place a pin first.");
      return;
    }
    setError(null);
    try {
      await post({
        kind: "PHOTO",
        body: body.trim(),
        photoId: active.id,
        x: parentId ? undefined : draft?.x,
        y: parentId ? undefined : draft?.y,
        parentId,
      });
      setBody("");
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post");
    }
  }

  if (!active) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_360px]">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-ink-soft">Click the photo to pin a comment. Team and clients see it live.</p>
          <LiveBadge connected={connected} />
        </div>
        <div
          className="relative overflow-hidden rounded-2xl border border-line bg-ink"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setDraft({
              x: (event.clientX - rect.left) / rect.width,
              y: (event.clientY - rect.top) / rect.height,
            });
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={active.url} alt={active.caption} className="max-h-[560px] w-full object-contain" />
          {roots.map((comment, index) =>
            comment.x != null && comment.y != null ? (
              <button
                key={comment.id}
                type="button"
                className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brass text-[11px] font-bold text-ink shadow"
                style={{ left: `${comment.x * 100}%`, top: `${comment.y * 100}%` }}
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                {index + 1}
              </button>
            ) : null,
          )}
          {draft ? (
            <span
              className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-field"
              style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }}
            />
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => {
                setActiveId(photo.id);
                setDraft(null);
              }}
              className={cn(
                "overflow-hidden rounded-lg border",
                photo.id === active.id ? "border-field ring-2 ring-field/30" : "border-line",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.caption} className="h-16 w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <aside className="rounded-2xl border border-line bg-white p-4">
        <h2 className="font-serif text-xl">Discussion</h2>
        <p className="mt-1 text-xs text-ink-soft">{active.caption || "Untitled photo"}</p>
        <div className="mt-4 max-h-[360px] space-y-4 overflow-y-auto">
          {roots.length === 0 ? <p className="text-sm text-ink-soft">No pins yet. Click the image to start.</p> : null}
          {roots.map((comment, index) => (
            <div key={comment.id} className="rounded-lg border border-line p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brass text-[10px] font-bold">
                  {index + 1}
                </span>
                <span className="text-sm font-medium">{comment.authorName}</span>
                {comment.authorRole === "CLIENT" ? (
                  <span className="rounded-full bg-paper-2 px-1.5 text-[10px] uppercase tracking-wide text-ink-soft">Client</span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-5">{comment.body}</p>
              <p className="mt-1 text-[11px] text-ink-soft">{format(comment.createdAt, "MMM d, h:mm a")}</p>
              <div className="mt-2 space-y-2">
                {repliesFor(onPhoto, comment.id).map((reply) => (
                  <div key={reply.id} className="rounded-md bg-paper px-2 py-1.5">
                    <p className="text-xs font-medium">
                      {reply.authorName}
                      {reply.authorId === currentUserId ? " (you)" : ""}
                    </p>
                    <p className="text-sm">{reply.body}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <form
          className="mt-4 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={draft ? "Write a comment on this pin…" : "Click the photo, then comment"}
          />
          {error ? <p className="text-sm text-clay">{error}</p> : null}
          <Button type="submit">Post comment</Button>
        </form>
      </aside>
    </div>
  );
}

export function LiveBadge({ connected }: { connected: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
      <span className={cn("h-2 w-2 rounded-full", connected ? "bg-sage" : "bg-line")} />
      {connected ? "Live" : "Reconnecting"}
    </span>
  );
}

export function AuthorChip({ name }: { name: string }) {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-field text-[10px] font-semibold text-white">
      {initials(name)}
    </span>
  );
}
