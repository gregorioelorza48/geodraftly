"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-client/AuthContext";
import { cn } from "@/lib/utils";

type AuthView = "auth" | "forgot" | "set-password";

export function AuthModal() {
  const {
    modalOpen,
    modalTab,
    intent,
    closeAuthModal,
    openAuthModal,
    login,
    signup,
    googleAuth,
    requestReset,
    resetPassword,
  } = useAuth();
  const [view, setView] = useState<AuthView>("auth");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState<"form" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!modalOpen) {
      setError(null);
      setLoading(null);
      setView("auth");
      setConfirm("");
      setResetToken(null);
      setResetUrl(null);
      setNotice(null);
    }
  }, [modalOpen]);

  if (!modalOpen) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading("form");
    try {
      if (view === "forgot") {
        const result = await requestReset(email);
        setNotice(result.message);
        setResetUrl(result.resetUrl ?? null);
        if (result.token) {
          setResetToken(result.token);
          setPassword("");
          setConfirm("");
          setView("set-password");
        }
      } else if (view === "set-password") {
        if (!resetToken) throw new Error("This reset link is invalid or has expired.");
        await resetPassword(resetToken, password, confirm);
        setPassword("");
        setConfirm("");
        setView("auth");
        openAuthModal({ tab: "signin", intent });
        setNotice("Password updated. Sign in with your new password.");
      } else if (modalTab === "signup") {
        await signup(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(null);
    }
  }

  async function continueGoogle() {
    setError(null);
    setLoading("google");
    try {
      await googleAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setLoading(null);
    }
  }

  const title =
    view === "forgot"
      ? "Reset your password"
      : view === "set-password"
        ? "Choose a new password"
        : modalTab === "signin"
          ? "Sign in to Geodraftly"
          : "Create your Geodraftly Account";

  return (
    <div className="pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close sign in"
        onClick={closeAuthModal}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/95 p-5 shadow-2xl backdrop-blur-md"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 grid grid-cols-2 rounded-lg border border-zinc-800 bg-zinc-950/80 p-1">
          {(["signin", "signup"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setView("auth");
                setError(null);
                setNotice(null);
                openAuthModal({ tab, intent });
              }}
              className={cn(
                "h-9 rounded-md text-sm font-semibold transition",
                view === "auth" && modalTab === tab ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-200",
              )}
            >
              {tab === "signin" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <h2 id="auth-modal-title" className="text-lg font-semibold text-zinc-100">
          {title}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {view === "forgot"
            ? "Enter the email on your account. We will show a reset link until email delivery is configured."
            : view === "set-password"
              ? "Use at least 8 characters. The reset link works once and expires in an hour."
              : intent === "save"
                ? "Your canvas is stored locally. Sign in to save the site layout to your projects."
                : "Sign in to save layouts, reopen them later, and export under your account."}
        </p>

        {notice ? (
          <p className="mt-3 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-2 text-sm text-cyan-100">
            {notice}
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-950/70 px-3 py-2 text-sm text-red-200" role="alert">
            {error}
          </p>
        ) : null}

        {view === "set-password" && resetUrl ? (
          <p className="mt-3 break-all text-xs text-zinc-500">
            Reset link:{" "}
            <span className="text-zinc-300">{resetUrl}</span>
          </p>
        ) : null}

        <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-3">
          {view === "auth" ? (
            <div
              className={cn(
                "grid overflow-hidden transition-all duration-300",
                modalTab === "signup" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Full name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={modalTab === "signup"}
                  autoComplete="name"
                  className="mb-3 h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none ring-cyan-400/20 placeholder:text-zinc-600 focus:border-cyan-400/40 focus:ring-4"
                  placeholder="Ava Chen"
                />
              </div>
            </div>
          ) : null}

          {view !== "set-password" ? (
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none ring-cyan-400/20 placeholder:text-zinc-600 focus:border-cyan-400/40 focus:ring-4"
                placeholder="you@firm.com"
              />
            </div>
          ) : null}

          {view === "auth" || view === "set-password" ? (
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {view === "set-password" ? "New password" : "Password"}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={view === "set-password" || modalTab === "signup" ? 8 : 1}
                autoComplete={view === "set-password" || modalTab === "signup" ? "new-password" : "current-password"}
                className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none ring-cyan-400/20 placeholder:text-zinc-600 focus:border-cyan-400/40 focus:ring-4"
                placeholder="••••••••"
              />
              {view === "auth" && modalTab === "signin" ? (
                <button
                  type="button"
                  onClick={() => {
                    setView("forgot");
                    setError(null);
                    setNotice(null);
                    setPassword("");
                  }}
                  className="mt-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  Forgot password?
                </button>
              ) : null}
            </div>
          ) : null}

          {view === "set-password" ? (
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none ring-cyan-400/20 placeholder:text-zinc-600 focus:border-cyan-400/40 focus:ring-4"
                placeholder="••••••••"
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading !== null}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-cyan-400 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:opacity-60"
          >
            {loading === "form"
              ? "Working…"
              : view === "forgot"
                ? "Send reset link"
                : view === "set-password"
                  ? "Set new password"
                  : modalTab === "signin"
                    ? "Sign in"
                    : "Create account"}
          </button>
        </form>

        {view === "forgot" || view === "set-password" ? (
          <button
            type="button"
            onClick={() => {
              setView("auth");
              setError(null);
              setNotice(null);
              openAuthModal({ tab: "signin", intent });
            }}
            className="mt-3 text-sm font-semibold text-zinc-400 hover:text-zinc-200"
          >
            Back to sign in
          </button>
        ) : (
          <>
            <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-zinc-600">
              <span className="h-px flex-1 bg-zinc-800" />
              or
              <span className="h-px flex-1 bg-zinc-800" />
            </div>

            <button
              type="button"
              onClick={() => void continueGoogle()}
              disabled={loading !== null}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 text-sm font-semibold text-zinc-100 hover:border-zinc-500 disabled:opacity-60"
            >
              <GoogleMark />
              {loading === "google" ? "Connecting…" : "Continue with Google"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.6-2.6C16.8 3.2 14.6 2.2 12 2.2 6.9 2.2 2.7 6.4 2.7 11.5S6.9 20.8 12 20.8c6.9 0 9.1-4.8 9.1-7.3 0-.5 0-.8-.1-1.2H12z" />
    </svg>
  );
}
