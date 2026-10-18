import { API_BASE } from "./config";
// Recovery always contacts the server: demo mode must never claim to send a real code.
async function request<T>(path: string, body: object): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_BASE}/api/auth/recovery/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.message || "Recovery request failed. Please try again later.");
    return payload.data as T;
  } finally { clearTimeout(timeout); }
}
export const requestPasswordRecovery = (identifier: string) => request<{ requestId: string }>("request", { identifier });
export const confirmPasswordRecovery = (requestId: string, code: string, newPassword: string) => request<void>("confirm", { requestId, code, newPassword });
