import type { DesignSnapshot } from "@/lib/design/persist";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  provider: "password" | "google" | "cookie";
};

export type AuthSession = {
  user: AuthUser;
  sessionToken: string;
};

export type SavedProject = {
  id: string;
  name: string;
  updatedAt: string;
  snapshot: DesignSnapshot;
};

const SESSION_KEY = "geodraftly-auth-session";
const USERS_KEY = "geodraftly-auth-users";
const PROJECTS_KEY = "geodraftly-auth-projects";
const RESETS_KEY = "geodraftly-auth-resets";

type MockReset = {
  token: string;
  userId: string;
  expiresAt: number;
  used: boolean;
};

function delay(ms = 420) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tokenFor(user: AuthUser) {
  const payload = { sub: user.id, email: user.email, name: user.name, iat: Date.now() };
  return `mock.${btoa(JSON.stringify(payload))}.local`;
}

function readUsers(): Array<AuthUser & { password: string }> {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeUsers(users: Array<AuthUser & { password: string }>) {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readProjectMap(): Record<string, SavedProject[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(PROJECTS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeProjectMap(map: Record<string, SavedProject[]>) {
  window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(map));
}

function readResets(): MockReset[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(RESETS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeResets(resets: MockReset[]) {
  window.localStorage.setItem(RESETS_KEY, JSON.stringify(resets));
}

export const authService = {
  getSession(): AuthSession | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  },

  writeSession(session: AuthSession) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  async login(email: string, password: string): Promise<AuthSession> {
    // TODO: Replace this mock with your backend.
    // Supabase: const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    // Firebase: await signInWithEmailAndPassword(auth, email, password)
    // NextAuth: await signIn("credentials", { email, password, redirect: false })
    await delay();
    const users = readUsers();
    const match = users.find((u) => u.email === email.toLowerCase().trim());
    if (!match || match.password !== password) {
      throw new Error("Invalid email or password.");
    }
    const user: AuthUser = { id: match.id, email: match.email, name: match.name, provider: "password" };
    const session = { user, sessionToken: tokenFor(user) };
    this.writeSession(session);
    return session;
  },

  async signup(name: string, email: string, password: string): Promise<AuthSession> {
    // TODO: Replace this mock with your backend.
    // Supabase: await supabase.auth.signUp({ email, password, options: { data: { name } } })
    // Firebase: const cred = await createUserWithEmailAndPassword(auth, email, password); await updateProfile(cred.user, { displayName: name })
    // NextAuth: POST /api/auth/register then signIn("credentials", ...)
    await delay();
    const normalized = email.toLowerCase().trim();
    const users = readUsers();
    if (users.some((u) => u.email === normalized)) {
      throw new Error("An account with that email already exists.");
    }
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    const user: AuthUser = {
      id: crypto.randomUUID(),
      email: normalized,
      name: name.trim(),
      provider: "password",
    };
    writeUsers([...users, { ...user, password }]);
    const session = { user, sessionToken: tokenFor(user) };
    this.writeSession(session);
    return session;
  },

  async requestReset(email: string): Promise<{ message: string; resetUrl?: string; token?: string }> {
    await delay();
    const normalized = email.toLowerCase().trim();
    const message = "If that email is on file, you can use the reset link below. No mailer is configured yet.";
    let resetUrl: string | undefined;
    let token: string | undefined;

    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      const data = (await res.json()) as { resetUrl?: string; error?: string };
      if (data.resetUrl) {
        resetUrl = data.resetUrl;
        token = new URL(data.resetUrl).searchParams.get("token") ?? undefined;
      }
    } catch {
      // Workbench still works offline against the mock store.
    }

    if (!resetUrl) {
      const users = readUsers();
      const match = users.find((u) => u.email === normalized);
      if (match) {
        token = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
        const resets = readResets().map((row) => (row.userId === match.id ? { ...row, used: true } : row));
        resets.push({ token, userId: match.id, expiresAt: Date.now() + 60 * 60 * 1000, used: false });
        writeResets(resets);
        resetUrl = `${window.location.origin}/reset-password?token=${token}`;
      }
    }

    return { message, resetUrl, token };
  },

  async resetPassword(token: string, password: string, confirm: string) {
    if (password !== confirm) throw new Error("Passwords do not match");
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    await delay();

    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirm }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) return;
    } catch {
      // Fall through to the mock store.
    }

    const resets = readResets();
    const row = resets.find((item) => item.token === token && !item.used && item.expiresAt > Date.now());
    if (!row) throw new Error("This reset link is invalid or has expired.");
    const users = readUsers();
    const index = users.findIndex((user) => user.id === row.userId);
    if (index < 0) throw new Error("This reset link is invalid or has expired.");
    users[index] = { ...users[index], password };
    writeUsers(users);
    writeResets(resets.map((item) => (item.token === token ? { ...item, used: true } : item)));
  },

  async googleAuth(): Promise<AuthSession> {
    // TODO: Replace this mock with a real OAuth redirect / popup.
    // Supabase: await supabase.auth.signInWithOAuth({ provider: "google" })
    // Firebase: await signInWithPopup(auth, new GoogleAuthProvider())
    // NextAuth: await signIn("google")
    await delay(700);
    const user: AuthUser = {
      id: `google-${crypto.randomUUID()}`,
      email: "designer@gmail.com",
      name: "Google Designer",
      provider: "google",
    };
    const session = { user, sessionToken: tokenFor(user) };
    this.writeSession(session);
    return session;
  },

  async logout() {
    // TODO: Also sign out of the real provider.
    // Supabase: await supabase.auth.signOut()
    // Firebase: await signOut(auth)
    // NextAuth: await signOut({ redirect: false })
    await delay(200);
    window.localStorage.removeItem(SESSION_KEY);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Cookie session may not exist when using the mock store only.
    }
  },

  async listProjects(userId: string): Promise<SavedProject[]> {
    // TODO: GET /api/projects or supabase.from("design_projects").select()
    await delay(180);
    return readProjectMap()[userId] ?? [];
  },

  async saveProject(userId: string, snapshot: DesignSnapshot): Promise<SavedProject> {
    // TODO: POST /api/projects with the GeoJSON snapshot + inspector metrics
    await delay(280);
    const map = readProjectMap();
    const list = map[userId] ?? [];
    const existing = snapshot.projectId ? list.find((p) => p.id === snapshot.projectId) : undefined;
    const record: SavedProject = {
      id: existing?.id ?? crypto.randomUUID(),
      name: snapshot.name || "Untitled site",
      updatedAt: new Date().toISOString(),
      snapshot: { ...snapshot, projectId: existing?.id ?? snapshot.projectId },
    };
    map[userId] = [record, ...list.filter((p) => p.id !== record.id)].slice(0, 24);
    writeProjectMap(map);
    return record;
  },
};
