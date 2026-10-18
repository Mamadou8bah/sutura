import type { VerificationCode } from "./twoFactor";
import { availabilityFetch } from "./demo";
import { API_BASE } from "./config";
import { authFetch, readAuthJson } from "./sessionAuth";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type AuthSession = {
  twoFactorRequired?: boolean;
  twoFactorChallengeId?: string | null;
  accessToken: string;
  refreshToken: string;
  username: string;
  role: string;
  firstName?: string;
  lastName?: string;
};

export type AgentOperation = {
  operation: string;
  reference: string;
  walletId: number;
  walletName: string;
  amount: number;
  currency: string;
  status: string;
  userId: number;
  merchantName: string;
  createdAt: string;
  completedAt?: string;
};

async function envelopeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await availabilityFetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await response.text();
  let payload: ApiEnvelope<T>;
  try {
    payload = JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    throw new Error(text || "Request failed");
  }
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || `Request failed (${response.status})`);
  }
  return payload.data;
}

async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authFetch(path, init);
  return readAuthJson<T>(response);
}

export const agentApi = {
  history: () => authRequest<AgentOperation[]>("/api/v1/agent/operations"),
  customer: (phone: string) =>
    authRequest<{ id: number; name: string }>(`/api/v1/agent/operations/customer?phone=${encodeURIComponent(phone)}`),

  createCash: (type: "DEPOSIT" | "WITHDRAWAL", userId: number, amount: string, currency: string, idempotencyKey: string) =>
    authRequest<{ reference: string }>(`/api/v1/${type === "DEPOSIT" ? "deposits" : "withdrawals"}`, {
      method: "POST",
      body: JSON.stringify({ userId, amount, currency, idempotencyKey,
        ...(type === "DEPOSIT" ? { paymentMethod: "agent" } : { withdrawalMethod: "agent" }) }),
    }),
  login: (email: string, password: string, verification?: VerificationCode) =>
    envelopeRequest<AuthSession>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: email, password, twoFactorChallengeId: verification?.challengeId, twoFactorCode: verification?.code }),
    }),

  lookup: (reference: string) =>
    authRequest<AgentOperation>(`/api/v1/agent/operations/${encodeURIComponent(reference)}`),

  complete: (reference: string) =>
    authRequest<AgentOperation>(`/api/v1/agent/operations/${encodeURIComponent(reference)}/complete`, {
      method: "POST",
    }),
};
