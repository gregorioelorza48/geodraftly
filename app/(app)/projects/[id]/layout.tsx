import { ProjectTabs } from "@/components/project-tabs";
import { ProjectStatusBadge } from "@/components/status-badge";
import { assertProjectAccess } from "@/lib/auth";
import { PROJECT_TYPE_LABELS, getLabel } from "@/lib/labels";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { project, isClient } = await assertProjectAccess(id);

  return (
    <>
      <div className="mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-deep">{project.number}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl tracking-tight">{project.name}</h1>
          <ProjectStatusBadge value={project.status} />
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {project.client} · {getLabel(PROJECT_TYPE_LABELS, project.type)}
        </p>
      </div>
      <ProjectTabs projectId={project.id} isClient={isClient} />
      {children}
    </>
  );
}
