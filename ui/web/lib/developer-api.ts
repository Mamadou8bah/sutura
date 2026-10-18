import { authenticatedFetch, readAuthenticatedJson } from "./authenticated-fetch";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(path, init);
  const payload = await readAuthenticatedJson<ApiEnvelope<T>>(response);
  if (!payload.success) {
    throw new Error(payload.message || "Request failed");
  }
  return payload.data;
}

export type ApiKeyInfo = {
  name: string;
  publicId: string;
  expiresAt: string;
  revoked: boolean;
  apiKey: string | null;
};

export const developerApi = {
  listPayments: async () => readAuthenticatedJson<Array<{id:number;reference:string;amount:number;currency:string;status:string;createdAt:string}>>(await authenticatedFetch("/api/v1/transactions")),
  listApiKeys: () => request<ApiKeyInfo[]>("/api/auth/api-keys"),

  createApiKey: (name: string, expiresInDays: number) =>
    request<ApiKeyInfo>("/api/auth/api-keys", {
      method: "POST",
      body: JSON.stringify({ name, expiresInDays }),
    }),

  revokeApiKey: (publicId: string) =>
    request<string>(`/api/auth/api-keys/${encodeURIComponent(publicId)}/revoke`, { method: "POST" }),

  deleteApiKey: (apiKey: string) =>
    request<string>("/api/auth/api-keys", {
      method: "DELETE",
      headers: { "X-Api-Key": apiKey },
    }),
};
