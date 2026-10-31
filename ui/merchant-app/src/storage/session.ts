import type { AuthPayload } from "../api/merchantRegistration";
import { clearSession as clearSecure, loadSession, saveSession as saveSecure } from "./secureSession";

const SESSION_KEY = "sutura_merchant_session";

export type MerchantSession = {
  accessToken: string;
  refreshToken: string;
  email: string;
  role: string;
  userStatus: string;
  businessName: string;
};

export async function saveSession(auth: AuthPayload, businessName: string): Promise<void> {
  const session: MerchantSession = {
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    email: auth.username,
    role: auth.role,
    userStatus: auth.userStatus,
    businessName,
  };
  await saveSecure(SESSION_KEY, JSON.stringify(session));
}

export async function getSession(): Promise<MerchantSession | null> {
  const raw = await loadSession(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as MerchantSession;
    return session.accessToken?.startsWith("demo.") ? null : session;
  } catch {
    return null;
  }
}

export async function updateStoredSession(session: MerchantSession): Promise<void> {
  await saveSecure(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await clearSecure(SESSION_KEY);
}
