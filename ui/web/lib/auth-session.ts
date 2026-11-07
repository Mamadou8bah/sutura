import type { DemoRole } from "./mock/demo-users";

const AUTH_SESSION_KEY = "sutura_auth_session";

export type AppRole = DemoRole;

export type AppSession = {
  email: string;
  role: AppRole;
  name: string;
  accessToken?: string;
  refreshToken?: string;
  userStatus?: string;
  source: "demo" | "api";
};

export function mapBackendRole(role: string): AppRole {
  switch (role) {
    case "ADMIN":
      return "admin";
    case "MERCHANT":
      return "merchant";
    case "DEVELOPER":
      return "developer";
    default:
      return "customer";
  }
}

export function saveAuthSession(auth: {
  username: string;
  role: string;
  accessToken: string;
  refreshToken: string;
  userStatus: string;
  firstName?: string;
  lastName?: string;
}): void {
  if (typeof window === "undefined") return;
  const session: AppSession = {
    email: auth.username,
    role: mapBackendRole(auth.role),
    name: auth.firstName && auth.lastName ? `${auth.firstName} ${auth.lastName}` : auth.username,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    userStatus: auth.userStatus,
    source: "api",
  };
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function updateAuthSession(tokens: { accessToken: string; refreshToken: string }): void {
  if (typeof window === "undefined") return;
  const current = getAuthSession();
  if (!current) return;
  const session: AppSession = {
    ...current,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function getAuthSession(): AppSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AppSession;
    if (session.source !== "api" || !session.accessToken || !session.refreshToken || session.accessToken.startsWith("demo.")) {
      clearAuthSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_SESSION_KEY);
}

export function getDashboardPath(role: AppRole): string {
  if (role === "customer") return "/app";
  return "/dashboard";
}
