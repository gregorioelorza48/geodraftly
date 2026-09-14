"use client";

import { useActionState } from "react";
import { FormSubmit } from "@/components/form-submit";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui";
import { createProjectAction, updateProjectAction } from "@/lib/actions/projects";
import { createVisitAction } from "@/lib/actions/visits";
import { createIssueAction } from "@/lib/actions/issues";
import { generateReportAction } from "@/lib/actions/reports";
import { inviteMemberAction, updateOrganizationAction } from "@/lib/actions/auth";
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS, PROJECT_STATUSES, PROJECT_TYPES, PRIORITIES, PRIORITY_LABELS } from "@/lib/labels";
import type { Project } from "@prisma/client";

function ErrorFrom({ state }: { state: unknown }) {
  return <FieldError message={state && typeof state === "object" && "error" in state ? String((state as { error?: string }).error) : undefined} />;
}

export function CreateProjectForm() {
  const [state, action] = useActionState(createProjectAction, undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="name">Project name</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="number">Project number</Label>
        <Input id="number" name="number" placeholder="LA-26-014" required />
      </div>
      <div>
        <Label htmlFor="client">Client</Label>
        <Input id="client" name="client" required />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="address">Site address</Label>
        <Input id="address" name="address" required />
      </div>
      <div>
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" />
        </div>
        <div>
          <Label htmlFor="postalCode">ZIP</Label>
          <Input id="postalCode" name="postalCode" />
        </div>
      </div>
      <div>
        <Label htmlFor="type">Project type</Label>
        <Select id="type" name="type" defaultValue="LANDSCAPE_ARCHITECTURE">
          {PROJECT_TYPES.map((t) => (
            <option key={t} value={t}>
              {PROJECT_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" />
      </div>
      <div>
        <Label htmlFor="latitude">Latitude (optional)</Label>
        <Input id="latitude" name="latitude" />
      </div>
      <div>
        <Label htmlFor="longitude">Longitude (optional)</Label>
        <Input id="longitude" name="longitude" />
      </div>
      <div className="sm:col-span-2 space-y-3">
        <ErrorFrom state={state} />
        <FormSubmit>Create project</FormSubmit>
      </div>
    </form>
  );
}

export function EditProjectForm({ project }: { project: Project }) {
  const [state, formAction] = useActionState(async (_: unknown, data: FormData) => updateProjectAction(project.id, data), undefined);
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="name">Project name</Label>
        <Input id="name" name="name" defaultValue={project.name} required />
      </div>
      <div>
        <Label htmlFor="number">Project number</Label>
        <Input id="number" name="number" defaultValue={project.number} required />
      </div>
      <div>
        <Label htmlFor="client">Client</Label>
        <Input id="client" name="client" defaultValue={project.client} required />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="address">Site address</Label>
        <Input id="address" name="address" defaultValue={project.address} required />
      </div>
      <div>
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" defaultValue={project.city} />
      </div>
      <div>
        <Label htmlFor="state">State</Label>
        <Input id="state" name="state" defaultValue={project.state} />
      </div>
      <div>
        <Label htmlFor="postalCode">ZIP</Label>
        <Input id="postalCode" name="postalCode" defaultValue={project.postalCode} />
      </div>
      <div>
        <Label htmlFor="type">Type</Label>
        <Select id="type" name="type" defaultValue={project.type}>
          {PROJECT_TYPES.map((t) => (
            <option key={t} value={t}>
              {PROJECT_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select id="status" name="status" defaultValue={project.status}>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={project.description} />
      </div>
      <div>
        <Label htmlFor="latitude">Latitude</Label>
        <Input id="latitude" name="latitude" defaultValue={project.latitude ?? ""} />
      </div>
      <div>
        <Label htmlFor="longitude">Longitude</Label>
        <Input id="longitude" name="longitude" defaultValue={project.longitude ?? ""} />
      </div>
      <div className="sm:col-span-2 space-y-3">
        <ErrorFrom state={state} />
        <FormSubmit>Save project</FormSubmit>
      </div>
    </form>
  );
}

export function CreateVisitForm({ projectId }: { projectId: string }) {
  const [state, action] = useActionState(async (_: unknown, data: FormData) => createVisitAction(projectId, data), undefined);
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="visitedAt">Date and time</Label>
        <Input id="visitedAt" name="visitedAt" type="datetime-local" defaultValue={local} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="weather">Weather</Label>
          <Input id="weather" name="weather" placeholder="Partly cloudy" />
        </div>
        <div>
          <Label htmlFor="temperatureF">Temperature °F</Label>
          <Input id="temperatureF" name="temperatureF" type="number" step="0.1" />
        </div>
      </div>
      <div>
        <Label htmlFor="notes">General notes</Label>
        <Textarea id="notes" name="notes" placeholder="Arrival notes, access, people on site…" />
      </div>
      <ErrorFrom state={state} />
      <FormSubmit>Start site visit</FormSubmit>
    </form>
  );
}

export function CreateIssueForm({
  projectId,
  siteVisitId,
  observationId,
  members,
}: {
  projectId: string;
  siteVisitId?: string;
  observationId?: string;
  members: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(async (_: unknown, data: FormData) => createIssueAction(projectId, data), undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="title">Punch item</Label>
        <Input id="title" name="title" required />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" name="priority" defaultValue="MEDIUM">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
      </div>
      <div>
        <Label htmlFor="assigneeId">Assign to</Label>
        <Select id="assigneeId" name="assigneeId" defaultValue="">
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </div>
      {siteVisitId ? <input type="hidden" name="siteVisitId" value={siteVisitId} /> : null}
      {observationId ? <input type="hidden" name="observationId" value={observationId} /> : null}
      <ErrorFrom state={state} />
      <FormSubmit>Add punch item</FormSubmit>
    </form>
  );
}

export function GenerateReportButton({ visitId }: { visitId: string }) {
  const [state, action] = useActionState(async () => generateReportAction(visitId), undefined as { error?: string; ok?: boolean; id?: string } | undefined);
  return (
    <form action={action} className="space-y-2">
      <FormSubmit>Generate site observation report</FormSubmit>
      <ErrorFrom state={state} />
    </form>
  );
}

export function FirmSettingsForm({
  org,
}: {
  org: { name: string; legalName: string | null; email: string | null; phone: string | null; website: string | null; address: string | null };
}) {
  const [state, action] = useActionState(updateOrganizationAction, undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="name">Firm name</Label>
        <Input id="name" name="name" defaultValue={org.name} required />
      </div>
      <div>
        <Label htmlFor="legalName">Legal name</Label>
        <Input id="legalName" name="legalName" defaultValue={org.legalName ?? ""} />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={org.email ?? ""} />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" defaultValue={org.phone ?? ""} />
      </div>
      <div>
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" defaultValue={org.website ?? ""} />
      </div>
      <div>
        <Label htmlFor="address">Office address</Label>
        <Input id="address" name="address" defaultValue={org.address ?? ""} />
      </div>
      <div className="sm:col-span-2 space-y-3">
        <ErrorFrom state={state} />
        <FormSubmit>Save firm settings</FormSubmit>
      </div>
    </form>
  );
}

export function InviteForm() {
  const [state, action] = useActionState(inviteMemberAction, undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div>
        <Label htmlFor="role">Role</Label>
        <Select id="role" name="role" defaultValue="MEMBER">
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="password">Password (new accounts only)</Label>
        <Input id="password" name="password" type="password" minLength={8} />
      </div>
      <div className="flex items-end">
        <FormSubmit>Add teammate</FormSubmit>
      </div>
      <div className="sm:col-span-2">
        <ErrorFrom state={state} />
      </div>
    </form>
  );
}
