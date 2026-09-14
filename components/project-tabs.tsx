"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/visits", label: "Site Visits" },
  { href: "/observations", label: "Observations" },
  { href: "/issues", label: "Issues" },
  { href: "/photos", label: "Photos" },
  { href: "/map", label: "Map" },
  { href: "/reports", label: "Reports" },
  { href: "/team", label: "Team" },
  { href: "/settings", label: "Settings" },
];

export function ProjectTabs({ projectId, isClient }: { projectId: string; isClient?: boolean }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = isClient
    ? TABS.filter((tab) => ["", "/observations", "/photos", "/map", "/reports"].includes(tab.href))
    : TABS;

  return (
    <div className="-mx-4 mb-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const href = `${base}${tab.href}`;
          const active = tab.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "min-h-11 px-3 py-2 text-sm font-medium",
                active ? "border-b-2 border-field text-ink" : "text-ink-soft hover:text-ink",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
