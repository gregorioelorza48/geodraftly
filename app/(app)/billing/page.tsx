import { requireOrg } from "@/lib/auth";
import { BillingPanel } from "@/components/billing/billing-panel";
import { PageHeader } from "@/components/ui";

export default async function BillingPage() {
  const { organization, user, isClient } = await requireOrg();

  return (
    <>
      <PageHeader
        kicker="Money"
        title="Billing"
        description="Subscriptions and entitlements for this firm, managed through RevenueCat."
      />
      <BillingPanel
        organizationId={organization.id}
        organizationName={organization.name}
        userEmail={user.email}
        userName={user.name}
        canManage={!isClient}
      />
    </>
  );
}
