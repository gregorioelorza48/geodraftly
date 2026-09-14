"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-client/AuthContext";
import { authService } from "@/lib/auth-client/authService";
import { writeDraft } from "@/lib/design/persist";
import { useDesign } from "@/lib/design/store";

export function SaveOnAuth() {
  const { isAuthenticated, user, intent } = useAuth();
  const { captureSnapshot } = useDesign();
  const saved = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user || intent !== "save" || saved.current) return;
    saved.current = true;
    const snapshot = captureSnapshot();
    writeDraft(snapshot);
    void authService.saveProject(user.id, snapshot);
  }, [isAuthenticated, user, intent, captureSnapshot]);

  return null;
}
