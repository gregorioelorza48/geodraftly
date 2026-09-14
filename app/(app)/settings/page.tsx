import { requireOrg } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { FirmSettingsForm } from "@/components/action-forms";

export default async function SettingsPage() {
  const { organization } = await requireOrg();
  return (
    <>
      <PageHeader title="Settings" description="Firm identity used on generated reports." />
      <Card>
        <FirmSettingsForm org={organization} />
      </Card>
    </>
  );
}
