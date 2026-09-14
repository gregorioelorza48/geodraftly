import { EventEmitter } from "events";

const globalForBus = globalThis as unknown as { geodraftlyCollab?: EventEmitter };

export const collabBus = globalForBus.geodraftlyCollab ?? new EventEmitter();
collabBus.setMaxListeners(200);
if (process.env.NODE_ENV !== "production") globalForBus.geodraftlyCollab = collabBus;

export type CollabEvent = {
  type: "comment";
  projectId: string;
  comment: CollabComment;
};

export type CollabComment = {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  kind: string;
  body: string;
  photoId: string | null;
  x: number | null;
  y: number | null;
  latitude: number | null;
  longitude: number | null;
  parentId: string | null;
  createdAt: string;
};

export function publishComment(comment: CollabComment) {
  const event: CollabEvent = { type: "comment", projectId: comment.projectId, comment };
  collabBus.emit(comment.projectId, event);
}

export function subscribeProject(projectId: string, listener: (event: CollabEvent) => void) {
  collabBus.on(projectId, listener);
  return () => collabBus.off(projectId, listener);
}
