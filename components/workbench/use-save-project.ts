"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-client/AuthContext";
import { authService } from "@/lib/auth-client/authService";
import { writeDraft } from "@/lib/design/persist";
import { useDesign } from "@/lib/design/store";

export function useSaveProject() {
  const { isAuthenticated, user, openAuthModal } = useAuth();
  const { captureSnapshot } = useDesign();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function persist() {
    if (!user) return;
    setStatus("saving");
    try {
      const snapshot = captureSnapshot();
      writeDraft(snapshot);
      const saved = await authService.saveProject(user.id, snapshot);
      setStatus("saved");
      setMessage(`Saved “${saved.name}”`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not save project.");
    }
  }

  async function saveProject() {
    const snapshot = captureSnapshot();
    writeDraft(snapshot);
    if (!isAuthenticated) {
      openAuthModal({ tab: "signin", intent: "save" });
      setMessage("Sign in to save this layout.");
      return;
    }
    await persist();
  }

  return { saveProject, status, message };
}
