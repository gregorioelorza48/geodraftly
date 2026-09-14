"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  CreditCard,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { logoutAction } from "@/lib/actions/auth";
import { cn, initials } from "@/lib/utils";

const STAFF_NAV = [
  { href: "/dashboard", label: "Workbench", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/visits", label: "Site Visits", icon: MapPinned },
  { href: "/issues", label: "Issues", icon: ClipboardList },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/team", label: "Team", icon: Users },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

const CLIENT_NAV = [
  { href: "/dashboard", label: "Workbench", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
];

export function AppShell({
  children,
  orgName,
  userName,
  isClient,
}: {
  children: React.ReactNode;
  orgName: string;
  userName: string;
  isClient?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const NAV = isClient ? CLIENT_NAV : STAFF_NAV;

  const links = (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium",
              active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden flex-col bg-field-deep px-4 py-5 text-white lg:flex">
        <Link href="/dashboard" className="mb-8 px-2">
          <p className="font-serif text-2xl tracking-tight">Geodraftly</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/50">{orgName}</p>
        </Link>
        {links}
        <div className="mt-6 flex items-center justify-between gap-2 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brass text-xs font-semibold text-ink">
              {initials(userName)}
            </div>
            <p className="truncate text-sm text-white/80">{userName}</p>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="rounded-md p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/dashboard" className="font-serif text-xl">
            Geodraftly
          </Link>
          <button type="button" className="rounded-lg p-2 hover:bg-paper-2" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {open ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-label="Close menu" />
            <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-field-deep px-4 py-5 text-white">
              <div className="mb-6 flex items-center justify-between">
                <p className="font-serif text-2xl">Geodraftly</p>
                <button type="button" onClick={() => setOpen(false)} className="p-2" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {links}
            </div>
          </div>
        ) : null}

        <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
