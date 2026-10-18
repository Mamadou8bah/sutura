import { API_BASE } from "./api-base";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  userId: number;
  username: string;
  role: string;
  userStatus: string;
  twoFactorRequired: boolean;
  twoFactorChallengeId: string | null;
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: ApiEnvelope<T>;
  try {
    payload = JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    throw new Error(text || "Request failed");
  }
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Request failed");
  }
  return payload.data;
}

export type RegisterRole = "DEVELOPER";

export const authApi = {
  register: (payload: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    password: string;
    role: RegisterRole;
  }) =>
    post<AuthPayload>("/api/auth/register", {
      ...payload,
      twoFactorEnabled: false,
    }),

  login: (username: string, password: string, verification?: {challengeId:string;code:string}) =>
    post<AuthPayload>("/api/auth/login", { username, password,twoFactorChallengeId:verification?.challengeId,twoFactorCode:verification?.code }),
};
