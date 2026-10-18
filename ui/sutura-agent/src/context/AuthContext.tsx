import {assertVerifiedSession, type VerificationCode} from "../api/twoFactor";
import { demoSession, isDemoMode, serverAvailable, setDemoMode, subscribeDemo } from "../api/demo";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { agentApi, type AuthSession } from "../api/client";
import { bindTokenSession } from "../api/sessionAuth";
import { clearSession, loadSession, saveSession } from "../storage/secureSession";

const SESSION_KEY = "sutura_agent_session";

type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  signIn: (email: string, password: string, verification?: VerificationCode) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => subscribeDemo(() => setSession(isDemoMode() ? demoSession("AGENT") : null)), []);

  const persistSession = useCallback(async (stored: AuthSession) => {
    if (!stored.accessToken.startsWith("demo.")) await saveSession(SESSION_KEY, JSON.stringify(stored));
    setSession(stored);
  }, []);

  const signOut = useCallback(async () => {
    if (!isDemoMode()) await clearSession(SESSION_KEY);
    setDemoMode(false);
    setSession(null);
  }, []);

  useEffect(() => {
    bindTokenSession({
      getSession: () => session,
      updateSession: persistSession,
      clearSession: signOut,
    });
  }, [session, persistSession, signOut]);

  useEffect(() => {
    loadSession(SESSION_KEY)
      .then((raw) => {
        if (raw) setSession(JSON.parse(raw) as AuthSession);
      })
      .catch(() => {
        // Corrupted session — force re-login
      })
      .finally(async () => { if (!(await serverAvailable())) setDemoMode(true); setLoading(false); });
  }, []);

  const signIn = useCallback(async (email: string, password: string, verification?: VerificationCode) => {
    const auth = await agentApi.login(email, password, verification);
    if (auth.role !== "AGENT" && auth.role !== "ADMIN") {
      throw new Error("This app is for Sutura agents only");
    }
    assertVerifiedSession(auth);
    await persistSession(auth);
  }, [persistSession]);

  const value = useMemo(
    () => ({ session, loading, signIn, signOut }),
    [session, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
