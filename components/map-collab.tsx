"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { SiteMapLoader } from "@/components/site-map-loader";
import { LiveBadge } from "@/components/photo-collab";
import { Button, Input } from "@/components/ui";
import { repliesFor, threadRoots, useProjectCollab } from "@/lib/hooks/use-project-collab";
import type { MapPoint } from "@/components/site-map";

export function MapCollab({
  projectId,
  observationPoints,
  surveyPoints = [],
  center,
}: {
  projectId: string;
  observationPoints: MapPoint[];
  surveyPoints?: MapPoint[];
  center?: [number, number];
}) {
  const { mapComments, connected, post } = useProjectCollab(projectId);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const roots = threadRoots(mapComments);
  const discussionPoints: MapPoint[] = roots
    .filter((c) => c.latitude != null && c.longitude != null)
    .map((c, index) => ({
      id: c.id,
      lat: c.latitude as number,
      lng: c.longitude as number,
      title: `Comment ${index + 1}`,
      subtitle: `${c.authorName}: ${c.body}`,
      kind: "discussion",
    }));

  const points = useMemo(
    () => [...observationPoints, ...surveyPoints, ...discussionPoints],
    [observationPoints, surveyPoints, discussionPoints],
  );

  async function submit() {
    if (!body.trim() || !draft) {
      setError("Click the map to drop a discussion pin, then write a comment.");
      return;
    }
    setError(null);
    try {
      await post({
        kind: "MAP",
        body: body.trim(),
        latitude: draft.lat,
        longitude: draft.lng,
      });
      setBody("");
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_360px]">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-soft">
            Forest pins are observations. Brass pins are live discussion. Steel pins are imported Civil 3D /
            survey points. Click to comment.
          </p>
          <LiveBadge connected={connected} />
        </div>
        <SiteMapLoader
          points={points}
          center={center}
          draft={draft}
          onPick={(lat, lng) => setDraft({ lat, lng })}
          className="h-[560px] overflow-hidden rounded-2xl border border-line"
        />
      </div>
      <aside className="rounded-2xl border border-line bg-white p-4">
        <h2 className="font-serif text-xl">Map comments</h2>
        <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto">
          {roots.length === 0 ? <p className="text-sm text-ink-soft">No discussion pins yet.</p> : null}
          {roots.map((comment, index) => (
            <div key={comment.id} className="rounded-lg border border-line p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-brass-deep">Pin {index + 1}</p>
              <p className="mt-1 text-sm font-medium">
                {comment.authorName}
                {comment.authorRole === "CLIENT" ? " · Client" : ""}
              </p>
              <p className="mt-1 text-sm leading-5">{comment.body}</p>
              <p className="mt-1 text-[11px] text-ink-soft">{format(comment.createdAt, "MMM d, h:mm a")}</p>
              {repliesFor(mapComments, comment.id).map((reply) => (
                <p key={reply.id} className="mt-2 rounded-md bg-paper px-2 py-1 text-sm">
                  <span className="font-medium">{reply.authorName}: </span>
                  {reply.body}
                </p>
              ))}
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
          {draft ? (
            <p className="text-xs text-ink-soft">
              Pin at {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
            </p>
          ) : null}
          <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Comment on this location…" />
          {error ? <p className="text-sm text-clay">{error}</p> : null}
          <Button type="submit">Post to map</Button>
        </form>
      </aside>
    </div>
  );
}
