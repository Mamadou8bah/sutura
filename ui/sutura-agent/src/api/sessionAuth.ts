import { availabilityFetch } from "./transport";
import { API_BASE } from "./config";

export type TokenSession = {
  accessToken: string;
  refreshToken: string;
};

type SessionHandlers<T extends TokenSession> = {
  getSession: () => T | null;
  updateSession: (session: T) => Promise<void>;
  clearSession: () => Promise<void>;
};

let handlers: SessionHandlers<TokenSession> | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function bindTokenSession<T extends TokenSession>(next: SessionHandlers<T>) {
  handlers = {
    getSession: next.getSession,
    clearSession: next.clearSession,
    updateSession: async (tokens) => {
      const current = next.getSession();
      if (current) await next.updateSession({ ...current, ...tokens });
    },
  };
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const session = handlers?.getSession();
    if (!session?.refreshToken) return null;

    try {
      const response = await availabilityFetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
      const text = await response.text();
      let payload: { success?: boolean; data?: { accessToken: string; refreshToken: string } };
      try {
        payload = JSON.parse(text);
      } catch {
        return null;
      }
      if (!response.ok || !payload.success || !payload.data) return null;

      const updated = { ...session, accessToken: payload.data.accessToken, refreshToken: payload.data.refreshToken };
      await handlers?.updateSession(updated);
      return payload.data.accessToken;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const session = handlers?.getSession();
  if (!session?.accessToken) throw new Error("Not authenticated");

  const withAuth = (token: string) =>
    availabilityFetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });

  let response = await withAuth(session.accessToken);
  if (response.status !== 401) return response;

  const newToken = await refreshAccessToken();
  if (!newToken) {
    await handlers?.clearSession();
    throw new Error("Session expired — please sign in again");
  }

  response = await withAuth(newToken);
  if (response.status === 401) {
    await handlers?.clearSession();
    throw new Error("Session expired — please sign in again");
  }
  return response;
}

export async function readAuthJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    try {
      const json = JSON.parse(text) as { message?: string; detail?: string };
      throw new Error(json.message || json.detail || text || `Request failed (${response.status})`);
    } catch (err) {
      if (err instanceof Error && err.message !== text) throw err;
      throw new Error(text || `Request failed (${response.status})`);
    }
  }
  return (await response.json()) as T;
}
