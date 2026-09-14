"use client";

import { useActionState } from "react";
import { completeVisitAction, updateVisitAction } from "@/lib/actions/visits";
import { VISIT_STATUS_LABELS, VISIT_STATUSES } from "@/lib/labels";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui";
import { FormSubmit } from "@/components/form-submit";
import type { SiteVisit } from "@prisma/client";

function toLocal(value: Date) {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function VisitEditor({ visit }: { visit: SiteVisit }) {
  const [state, action] = useActionState(async (_: unknown, data: FormData) => updateVisitAction(visit.id, data), undefined);
  const [completeState, complete] = useActionState(async () => completeVisitAction(visit.id), undefined);

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <div>
          <Label htmlFor="visitedAt">Date and time</Label>
          <Input id="visitedAt" name="visitedAt" type="datetime-local" defaultValue={toLocal(visit.visitedAt)} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="weather">Weather</Label>
            <Input id="weather" name="weather" defaultValue={visit.weather} />
          </div>
          <div>
            <Label htmlFor="temperatureF">Temperature °F</Label>
            <Input id="temperatureF" name="temperatureF" type="number" step="0.1" defaultValue={visit.temperatureF ?? ""} />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue={visit.status}>
              {VISIT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {VISIT_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="notes">General notes / executive summary</Label>
          <Textarea id="notes" name="notes" defaultValue={visit.notes} />
        </div>
        <div>
          <Label htmlFor="recommendations">Recommendations</Label>
          <Textarea id="recommendations" name="recommendations" defaultValue={visit.recommendations} />
        </div>
        <FieldError message={state && "error" in state ? state.error : undefined} />
        <FormSubmit>Save visit</FormSubmit>
      </form>
      {visit.status !== "COMPLETED" ? (
        <form action={complete}>
          <FormSubmit variant="secondary">Mark visit complete</FormSubmit>
          <FieldError message={completeState && "error" in completeState ? completeState.error : undefined} />
        </form>
      ) : null}
    </div>
  );
}
