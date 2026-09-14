import { format } from "date-fns";
import { assertProjectAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, EmptyState } from "@/components/ui";

export default async function ProjectReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await assertProjectAccess(id);
  const reports = await db.generatedReport.findMany({
    where: { projectId: id },
    include: { generatedBy: true, siteVisit: true },
    orderBy: { createdAt: "desc" },
  });

  if (reports.length === 0) {
    return (
      <EmptyState
        title="No reports yet"
        body="Open a site visit and generate a site observation report. The PDF is stored with the project."
      />
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <Card key={report.id} className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">{report.title}</p>
            <p className="text-sm text-ink-soft">
              {report.generatedBy.name} · {format(report.createdAt, "MMM d, yyyy h:mm a")} · {report.status}
            </p>
          </div>
          {report.status === "READY" && report.fileKey ? (
            <a href={`/api/reports/${report.id}`} className="inline-flex h-11 items-center rounded-lg bg-field px-4 text-sm font-semibold text-white">
              Download PDF
            </a>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
