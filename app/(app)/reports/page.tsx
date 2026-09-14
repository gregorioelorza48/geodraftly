import { format } from "date-fns";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export default async function ReportsPage() {
  const { organization } = await requireOrg();
  const reports = await db.generatedReport.findMany({
    where: { project: { organizationId: organization.id, deletedAt: null } },
    include: { project: true, generatedBy: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader title="Reports" description="Generated site observation PDFs." />
      {reports.length === 0 ? (
        <EmptyState title="No reports" body="Generate a report from any completed site visit." />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{report.title}</p>
                <p className="text-sm text-ink-soft">
                  {report.project.name} · {report.generatedBy.name} · {format(report.createdAt, "MMM d, yyyy")}
                </p>
              </div>
              {report.status === "READY" && report.fileKey ? (
                <a href={`/api/reports/${report.id}`} className="inline-flex h-11 items-center rounded-lg bg-field px-4 text-sm font-semibold text-white">
                  Download
                </a>
              ) : (
                <span className="text-sm text-ink-soft">{report.status}</span>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
