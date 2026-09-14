"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CollabComment } from "@/lib/collab";

export function useProjectCollab(projectId: string) {
  const [comments, setComments] = useState<CollabComment[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/collab?history=1`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.comments)) setComments(data.comments);
      })
      .catch(() => undefined);

    const source = new EventSource(`/api/projects/${projectId}/collab`);
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as { type?: string; comment?: CollabComment };
        if (event.type === "comment" && event.comment) {
          setComments((prev) => (prev.some((c) => c.id === event.comment!.id) ? prev : [...prev, event.comment!]));
        }
      } catch {
        // ignore malformed frames
      }
    };
    return () => {
      cancelled = true;
      source.close();
    };
  }, [projectId]);

  const post = useCallback(
    async (input: {
      kind: "PHOTO" | "MAP";
      body: string;
      photoId?: string;
      x?: number | null;
      y?: number | null;
      latitude?: number | null;
      longitude?: number | null;
      parentId?: string;
    }) => {
      const response = await fetch(`/api/projects/${projectId}/collab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not post comment");
      if (data.comment) {
        setComments((prev) => (prev.some((c) => c.id === data.comment.id) ? prev : [...prev, data.comment]));
      }
      return data.comment as CollabComment;
    },
    [projectId],
  );

  const photoComments = useMemo(() => comments.filter((c) => c.kind === "PHOTO"), [comments]);
  const mapComments = useMemo(() => comments.filter((c) => c.kind === "MAP"), [comments]);

  return { comments, photoComments, mapComments, connected, post };
}

export function threadRoots(comments: CollabComment[]) {
  return comments.filter((c) => !c.parentId);
}

export function repliesFor(comments: CollabComment[], parentId: string) {
  return comments.filter((c) => c.parentId === parentId);
}
