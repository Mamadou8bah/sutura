import {assertVerifiedSession, type VerificationCode} from "../api/twoFactor";
import { demoSession, isDemoMode, recoverLiveConnection, setDemoMode, subscribeDemo } from "../api/demo";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, type AuthSession, type CustomerRegistration } from "../api/client";
import { bindTokenSession } from "../api/sessionAuth";
import { clearSession, loadSession, saveSession } from "../storage/secureSession";

const SESSION_KEY = "sutura_customer_session";

type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  newlyRegistered: boolean;
  signUp: (payload: CustomerRegistration) => Promise<void>;
  signIn: (email: string, password: string, verification?: VerificationCode) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [newlyRegistered, setNewlyRegistered] = useState(false);
  const pendingSignup=useRef<Pick<CustomerRegistration,"firstName"|"lastName"|"phoneNumber">|null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let busy = false;
    const timer = setInterval(() => {
      if (!isDemoMode() || busy) return;
      busy = true;
      void recoverLiveConnection().finally(() => { busy = false; });
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => subscribeDemo(() => setSession(isDemoMode() ? demoSession("USER") : null)), []);

  const persistSession = useCallback(async (stored: AuthSession) => {
    if (!stored.accessToken.startsWith("demo.")) await saveSession(SESSION_KEY, JSON.stringify(stored));
    setSession(stored);
  }, []);

  const signOut = useCallback(async () => {
    if (!isDemoMode()) await clearSession(SESSION_KEY);
    setDemoMode(false);
    setSession(null);
    setNewlyRegistered(false);
  }, []);

  useEffect(() => {
    bindTokenSession({
      getSession: () => sessionRef.current,
      updateSession: persistSession,
      clearSession: signOut,
    });
  }, [session, persistSession, signOut]);

  useEffect(() => {
    loadSession(SESSION_KEY)
      .then((raw) => {
        if (raw) { const stored = JSON.parse(raw) as AuthSession; if (!stored.accessToken?.startsWith("demo.")) setSession(stored); }
      })
      .catch(() => {
        // Corrupted session — force re-login
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string, verification?: VerificationCode) => {
    const auth = await api.login(email, password, verification);
    assertVerifiedSession(auth);
    if (auth.role !== "USER") {
      throw new Error("Agent accounts must use the Sutura Agent app");
    }
    const stored: AuthSession = {
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      username: auth.username,
      role: auth.role,
      firstName: auth.firstName ?? (pendingSignup.current?.phoneNumber===auth.username?pendingSignup.current.firstName:undefined),
      lastName: auth.lastName ?? (pendingSignup.current?.phoneNumber===auth.username?pendingSignup.current.lastName:undefined),
    };
    await persistSession(stored);
    if(pendingSignup.current?.phoneNumber===auth.username)setNewlyRegistered(true);
    pendingSignup.current=null;
  }, [persistSession]);

  const signUp = useCallback(async (payload: CustomerRegistration) => {
    const auth = await api.register(payload);
    pendingSignup.current={firstName:payload.firstName,lastName:payload.lastName,phoneNumber:payload.phoneNumber};
    if (auth.role !== "USER") throw new Error("Registration did not create a customer account");
    assertVerifiedSession(auth);
    await persistSession({ ...auth, firstName: payload.firstName, lastName: payload.lastName });
    setNewlyRegistered(true);
  }, [persistSession]);

  const value = useMemo(
    () => ({ session, loading, signIn, signUp, signOut, newlyRegistered }),
    [session, loading, signIn, signUp, signOut, newlyRegistered],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
