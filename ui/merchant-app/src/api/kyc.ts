import { withKycWarmup, KycTemporaryError, type KycConnectionOptions } from "./kycWarmup";
import { authFetch, readAuthJson } from "./sessionAuth";

export type KycStatus = {
  status: "NOT_STARTED" | "PENDING" | "EXPIRED" | "VERIFIED" | "FLAGGED" | "REJECTED";
  sessionId: number | null;
  hostedUrl: string | null;
  explanation: string | null;
};
async function request(path: string, method = "GET", options: KycConnectionOptions = {}): Promise<KycStatus> {
  return withKycWarmup(async signal => {
    const response = await authFetch(`/api/v1/kyc${path}`, { method, signal });
    if ([502, 503, 504].includes(response.status)) throw new KycTemporaryError();
    const payload = await readAuthJson<{ success: boolean; message: string; data: KycStatus }>(response);
    if (!payload.success) throw new Error(payload.message);
    return payload.data;
  }, options);
}
export const kycApi = {
  status: (options?: KycConnectionOptions) => request("", "GET", options),
  start: (options?: KycConnectionOptions) => request("/sessions", "POST", options),
  refresh: (options?: KycConnectionOptions) => request("/refresh", "POST", options),
};
