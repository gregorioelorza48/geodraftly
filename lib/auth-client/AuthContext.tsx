"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authService, type AuthUser } from "./authService";

type AuthIntent = "default" | "save";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  sessionToken: string | null;
  ready: boolean;
  modalOpen: boolean;
  modalTab: "signin" | "signup";
  intent: AuthIntent;
  openAuthModal: (options?: { tab?: "signin" | "signup"; intent?: AuthIntent }) => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  googleAuth: () => Promise<void>;
  requestReset: (email: string) => Promise<{ message: string; resetUrl?: string; token?: string }>;
  resetPassword: (token: string, password: string, confirm: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"signin" | "signup">("signin");
  const [intent, setIntent] = useState<AuthIntent>("default");

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      const local = authService.getSession();
      if (local && !cancelled) {
        setUser(local.user);
        setSessionToken(local.sessionToken);
      }
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { user: AuthUser | null; sessionToken?: string };
          if (!cancelled && data.user) {
            setUser({ ...data.user, provider: data.user.provider ?? "cookie" });
            setSessionToken(data.sessionToken ?? "cookie");
          }
        }
      } catch {
        // Workbench still works offline against the mock store.
      }
      if (!cancelled) setReady(true);
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const applySession = useCallback((session: { user: AuthUser; sessionToken: string }) => {
    setUser(session.user);
    setSessionToken(session.sessionToken);
    setModalOpen(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      sessionToken,
      ready,
      modalOpen,
      modalTab,
      intent,
      openAuthModal(options) {
        setModalTab(options?.tab ?? "signin");
        setIntent(options?.intent ?? "default");
        setModalOpen(true);
      },
      closeAuthModal() {
        setModalOpen(false);
        setIntent("default");
      },
      async login(email, password) {
        applySession(await authService.login(email, password));
      },
      async signup(name, email, password) {
        applySession(await authService.signup(name, email, password));
      },
      async googleAuth() {
        applySession(await authService.googleAuth());
      },
      async requestReset(email) {
        return authService.requestReset(email);
      },
      async resetPassword(token, password, confirm) {
        await authService.resetPassword(token, password, confirm);
      },
      async logout() {
        await authService.logout();
        setUser(null);
        setSessionToken(null);
      },
    }),
    [user, sessionToken, ready, modalOpen, modalTab, intent, applySession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
