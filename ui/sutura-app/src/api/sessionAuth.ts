import { availabilityFetch } from "./transport";
import { API_BASE } from "./config";
import { deviceIsUnlocked } from "../storage/deviceAccess";
export type TokenSession = { accessToken: string; refreshToken: string };
type SessionHandlers<T extends TokenSession> = { getSession: () => T | null; updateSession: (session: T) => Promise<void>; clearSession: () => Promise<void> };
let handlers: SessionHandlers<TokenSession> | null = null;
let refreshInFlight: Promise<string | null> | null = null;
export function bindTokenSession<T extends TokenSession>(next: SessionHandlers<T>) {
  handlers = { getSession: next.getSession, clearSession: next.clearSession, updateSession: async tokens => { const current = next.getSession(); if (current) await next.updateSession({ ...current, ...tokens }); } };
}
async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const bound = handlers; const session = bound?.getSession();
    if (!session?.refreshToken) return null;
    try {
      const response = await availabilityFetch(`${API_BASE}/api/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: session.refreshToken }) });
      if (handlers?.getSession()?.refreshToken !== session.refreshToken) throw new Error("Account changed while reconnecting. Try again.");
      if (response.status === 401 || response.status === 403) return null;
      if (!response.ok) throw new Error("Could not reconnect to Sutura. Your saved session is kept; try again when connected.");
      let payload: { success?: boolean; data?: TokenSession };
      try { payload = JSON.parse(await response.text()); } catch { throw new Error("Invalid refresh response. Your saved session has been kept."); }
      if (!payload.success || !payload.data?.accessToken || !payload.data?.refreshToken) throw new Error("Invalid refresh response. Your saved session has been kept.");
      if (handlers?.getSession()?.refreshToken !== session.refreshToken) throw new Error("Account changed while reconnecting. Try again.");
      await bound?.updateSession({ ...session, ...payload.data });
      return payload.data.accessToken;
    } finally { refreshInFlight = null; }
  })();
  return refreshInFlight;
}
export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const session = handlers?.getSession(); if (!session?.accessToken) throw new Error("Not authenticated");
  if (!deviceIsUnlocked() && !["GET", "HEAD"].includes((init?.method ?? "GET").toUpperCase())) throw new Error("Unlock Sutura before making changes.");
  const withAuth = (token: string) => availabilityFetch(`${API_BASE}${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) } });
  let response = await withAuth(session.accessToken); if (response.status !== 401) return response;
  const token = await refreshAccessToken();
  if (!token) {
    if (handlers?.getSession()?.refreshToken === session.refreshToken) await handlers.clearSession();
    throw new Error("Session expired - please sign in again");
  }
  // An account/lock change during refresh must never replay a write for another session.
  if (handlers?.getSession()?.accessToken !== token) throw new Error("Account changed. Try again.");
  if (!deviceIsUnlocked() && !["GET", "HEAD"].includes((init?.method ?? "GET").toUpperCase())) throw new Error("Unlock Sutura before making changes.");
  response = await withAuth(token);
  if (response.status === 401) { if (handlers?.getSession()?.accessToken === token) await handlers.clearSession(); throw new Error("Session expired - please sign in again"); }
  return response;
}
export async function readAuthJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text(); let message = text || `Request failed (${response.status})`;
    try { const json = JSON.parse(text) as { message?: string; detail?: string }; message = json.message || json.detail || message; } catch { /* Preserve server text. */ }
    throw new Error(message);
  }
  return await response.json() as T;
}
