"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FieldError, Input, Label } from "@/components/ui";
import { FormSubmit } from "@/components/form-submit";

type Action = (state: unknown, formData: FormData) => Promise<{ error?: string } | void>;

export function AuthForm({
  action,
  mode,
  next,
}: {
  action: Action;
  mode: "login" | "signup";
  next?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "signup" ? (
        <>
          <div>
            <Label htmlFor="name">Your name</Label>
            <Input id="name" name="name" autoComplete="name" required />
          </div>
          <div>
            <Label htmlFor="organizationName">Firm name</Label>
            <Input id="organizationName" name="organizationName" placeholder="Northridge Studio" required />
          </div>
        </>
      ) : null}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "signup" ? 8 : undefined}
          required
        />
        {mode === "login" ? (
          <p className="mt-2 text-right text-sm">
            <Link href="/forgot-password" className="font-semibold text-field underline">
              Forgot password?
            </Link>
          </p>
        ) : null}
      </div>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FieldError message={state && "error" in state ? state.error : undefined} />
      <FormSubmit>{mode === "login" ? "Sign in" : "Create firm"}</FormSubmit>
    </form>
  );
}
