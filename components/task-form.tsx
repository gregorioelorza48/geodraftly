"use client";

import { useActionState } from "react";
import { createTaskAction, updateTaskStatusAction } from "@/lib/actions/issues";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui";
import { FormSubmit } from "@/components/form-submit";

export function CreateTaskForm({
  projects,
  members,
}: {
  projects: { id: string; name: string; number: string }[];
  members: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(createTaskAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="title">Task</Label>
        <Input id="title" name="title" required />
      </div>
      <div>
        <Label htmlFor="projectId">Project</Label>
        <Select id="projectId" name="projectId" required>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.number} — {p.name}
            </option>
          ))}
        </Select>
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
      <div>
        <Label htmlFor="dueDate">Due date</Label>
        <Input id="dueDate" name="dueDate" type="date" />
      </div>
      <div>
        <Label htmlFor="description">Notes</Label>
        <Textarea id="description" name="description" />
      </div>
      <FieldError message={state && "error" in state ? state.error : undefined} />
      <FormSubmit>Add task</FormSubmit>
    </form>
  );
}

export function TaskStatusForm({ taskId, status }: { taskId: string; status: "TODO" | "IN_PROGRESS" | "DONE" }) {
  return (
    <form
      action={async (data) => {
        await updateTaskStatusAction(taskId, data.get("status") as "TODO" | "IN_PROGRESS" | "DONE");
      }}
    >
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-10 rounded-lg border border-line bg-white px-2 text-sm"
      >
        <option value="TODO">To do</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="DONE">Done</option>
      </select>
    </form>
  );
}
