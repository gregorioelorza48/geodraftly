"use client";

import { useState } from "react";
import { Button, FieldError, Input, Label } from "@/components/ui";
import { authService } from "@/lib/auth-client/authService";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setResetUrl(null);
    setPending(true);
    try {
      const result = await authService.requestReset(email);
      setMessage(result.message);
      setResetUrl(result.resetUrl ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start a reset.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <FieldError message={error ?? undefined} />
      {message ? (
        <div className="space-y-2 rounded-lg border border-line bg-stone-50 px-3 py-2 text-sm text-ink">
          <p>{message}</p>
          {resetUrl ? (
            <p>
              <a href={resetUrl} className="break-all font-semibold text-field underline">
                {resetUrl}
              </a>
            </p>
          ) : (
            <p className="text-ink-soft">If no link appears, that email is not on file.</p>
          )}
        </div>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
