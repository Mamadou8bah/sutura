import { availabilityFetch } from "./transport";
import { API_BASE } from "./config";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await availabilityFetch(`${API_BASE}${path}`, {
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
