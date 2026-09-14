"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export function AppFrame({
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
  if (pathname === "/dashboard") {
    return <div className="h-dvh overflow-hidden bg-zinc-950">{children}</div>;
  }
  return (
    <AppShell orgName={orgName} userName={userName} isClient={isClient}>
      {children}
    </AppShell>
  );
}
