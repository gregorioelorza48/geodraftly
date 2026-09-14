"use client";

import { useEffect, useState } from "react";
import { ChevronDown, FolderOpen, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-client/AuthContext";
import { authService, type SavedProject } from "@/lib/auth-client/authService";
import { useDesign } from "@/lib/design/store";
import { initials } from "@/lib/utils";

export function UserMenu() {
  const { user, logout, openAuthModal, isAuthenticated } = useAuth();
  const { applySnapshot } = useDesign();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<SavedProject[]>([]);

  useEffect(() => {
    if (!open || !user) return;
    void authService.listProjects(user.id).then(setProjects);
  }, [open, user]);

  if (!isAuthenticated || !user) {
    return (
      <button
        type="button"
        onClick={() => openAuthModal({ tab: "signin" })}
        className="inline-flex h-8 items-center rounded-lg bg-cyan-400 px-3 text-xs font-semibold text-zinc-950 hover:bg-cyan-300"
      >
        Sign In
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 pl-1 pr-2 text-left"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-bold text-zinc-950">
          {initials(user.name) || user.email[0]?.toUpperCase()}
        </span>
        <span className="hidden max-w-[140px] truncate text-xs text-zinc-200 sm:block">{user.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-[60] w-72 rounded-xl border border-zinc-800 bg-zinc-900/95 p-2 shadow-2xl backdrop-blur-md">
          <div className="border-b border-zinc-800 px-2 py-2">
            <p className="truncate text-sm font-semibold text-zinc-100">{user.name}</p>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
          </div>
          <p className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">My saved projects</p>
          <div className="mt-1 max-h-48 overflow-y-auto">
            {projects.length === 0 ? (
              <p className="px-2 py-2 text-xs text-zinc-500">No saved layouts yet.</p>
            ) : (
              projects.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    applySnapshot(item.snapshot);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="min-w-0">
                    <span className="block truncate">{item.name}</span>
                    <span className="text-[10px] text-zinc-500">{new Date(item.updatedAt).toLocaleString()}</span>
                  </span>
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      ) : null}
    </div>
  );
}
