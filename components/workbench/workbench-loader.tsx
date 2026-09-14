"use client";

import dynamic from "next/dynamic";
import type { DesignProject } from "@/lib/design/types";

const DesignWorkbench = dynamic(
  () => import("./design-workbench").then((m) => m.DesignWorkbench),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh items-center justify-center bg-zinc-950 font-mono text-sm text-zinc-500">
        Initializing spatial workbench…
      </div>
    ),
  },
);

export function WorkbenchLoader({ projects }: { projects: DesignProject[] }) {
  return <DesignWorkbench projects={projects} />;
}
