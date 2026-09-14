import { AppFrame } from "@/components/app-frame";
import { requireOrg } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, organization, isClient } = await requireOrg();
  return (
    <AppFrame orgName={organization.name} userName={user.name} isClient={isClient}>
      {children}
    </AppFrame>
  );
}
