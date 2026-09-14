import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
      {children}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg border border-line bg-white px-3 text-[15px] text-ink outline-none ring-brass/30 placeholder:text-ink-soft/50 focus:border-field focus:ring-4",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[15px] text-ink outline-none ring-brass/30 placeholder:text-ink-soft/50 focus:border-field focus:ring-4",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-lg border border-line bg-white px-3 text-[15px] text-ink outline-none ring-brass/30 focus:border-field focus:ring-4",
        className,
      )}
      {...props}
    />
  );
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-field text-white hover:bg-field-deep",
        variant === "secondary" && "border border-line bg-white text-ink hover:border-field/40",
        variant === "ghost" && "text-ink-soft hover:bg-paper-2 hover:text-ink",
        variant === "danger" && "bg-clay text-white hover:bg-clay/90",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "brass";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]",
        tone === "neutral" && "bg-paper-2 text-ink-soft",
        tone === "good" && "bg-sage/15 text-field",
        tone === "warn" && "bg-brass/15 text-brass-deep",
        tone === "bad" && "bg-clay/12 text-clay",
        tone === "brass" && "bg-field text-white",
      )}
    >
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-line bg-white p-5 shadow-[0_1px_0_rgba(28,33,30,0.04)]", className)}>{children}</div>;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-start gap-3 border-dashed bg-paper/40 py-12">
      <h3 className="font-serif text-xl text-ink">{title}</h3>
      <p className="max-w-lg text-sm leading-6 text-ink-soft">{body}</p>
      {action}
    </Card>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-clay/30 bg-clay/8 px-3 py-2 text-sm text-clay" role="alert">
      {message}
    </p>
  );
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker ? <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-deep">{kicker}</p> : null}
        <h1 className="font-serif text-3xl tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
