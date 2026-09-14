"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

export function FormSubmit({
  children,
  variant = "primary",
  pendingLabel = "Saving…",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
