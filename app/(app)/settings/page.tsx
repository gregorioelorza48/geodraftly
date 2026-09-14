import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { FirmSettingsForm } from "@/components/action-forms";

export default async function SettingsPage() {
  const { organization, isClient } = await requireOrg();
  return (
    <>
      <PageHeader title="Settings" description="Firm identity used on generated reports." />
      {isClient ? null : (
        <Card className="mb-5">
          <h2 className="font-serif text-xl text-ink">Billing</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-soft">
            Subscriptions, plan changes, and RevenueCat entitlements for this firm.
          </p>
          <Link
            href="/billing"
            className="mt-4 inline-flex h-11 items-center rounded-lg bg-field px-4 text-sm font-semibold text-white"
          >
            Open billing
          </Link>
        </Card>
      )}
      <Card>
        <FirmSettingsForm org={organization} />
      </Card>
    </>
  );
}
