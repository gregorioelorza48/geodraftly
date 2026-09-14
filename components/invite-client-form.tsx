"use client";

import { useActionState } from "react";
import { inviteClientAction } from "@/lib/actions/collab";
import { FieldError, Input, Label } from "@/components/ui";
import { FormSubmit } from "@/components/form-submit";

export function InviteClientForm({ projectId }: { projectId: string }) {
  const [state, action] = useActionState(async (_: unknown, data: FormData) => inviteClientAction(projectId, data), undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="client-name">Name</Label>
        <Input id="client-name" name="name" required />
      </div>
      <div>
        <Label htmlFor="client-email">Email</Label>
        <Input id="client-email" name="email" type="email" required />
      </div>
      <div>
        <Label htmlFor="client-password">Password (new accounts)</Label>
        <Input id="client-password" name="password" type="password" minLength={8} />
      </div>
      <FieldError message={state && "error" in state ? state.error : undefined} />
      <FormSubmit>Invite client</FormSubmit>
    </form>
  );
}
