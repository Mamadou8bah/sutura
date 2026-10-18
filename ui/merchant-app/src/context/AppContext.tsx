import { applicationApi, type MerchantApplication } from "../api/application";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import {assertVerifiedSession, type VerificationCode} from "../api/twoFactor";
import { demoSession, isDemoMode, serverAvailable, setDemoMode, subscribeDemo } from "../api/demo";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { authApi } from "../api/merchantRegistration";
import { bindTokenSession } from "../api/sessionAuth";
import { clearSession, getSession, saveSession, updateStoredSession, type MerchantSession } from "../storage/session";

export type Screen =
  | "welcome"
  | "login"
  | "reg-phone"
  | "reg-otp"
  | "reg-business"
  | "reg-owner"
  | "reg-account"
  | "verification"
  | "pending"
  | "settings"
  | "home" | "collections" | "activity" | "wallets" | "support" | "more";

type RegistrationDraft = {
  token: string;
  phoneLocal: string;
  otp: string;
  business: {
    businessName: string;
    tradingName: string;
    category: string;
    region: string;
    cityOrArea: string;
    streetAddress: string;
    businessRegistrationNumber: string;
  };
  owner: {
    firstName: string;
    lastName: string;
    ownerIdType: string;
    ownerIdNumber: string;
  };
  account: {
    email: string;
    password: string;
    confirmPassword: string;
    acceptedTerms: boolean;
  };
};

type AppContextValue = {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  session: MerchantSession | null;
  loading: boolean;
  error: string;
  setError: (message: string) => void;
  reg: RegistrationDraft;
  updateReg: (patch: Partial<RegistrationDraft>) => void;
  resetReg: () => void;
  refreshSession: () => Promise<void>;
  application: MerchantApplication | null;
  refreshApplication: () => Promise<void>;
  signIn: (email: string, password: string, verification?: VerificationCode) => Promise<void>;
  signOut: () => Promise<void>;
  completeRegistration: (businessName: string, userStatus: string) => void;
};

const emptyReg = (): RegistrationDraft => ({
  token: "",
  phoneLocal: "",
  otp: "",
  business: {
    businessName: "",
    tradingName: "",
    category: "RETAIL_SHOP",
    region: "KANIFING",
    cityOrArea: "",
    streetAddress: "",
    businessRegistrationNumber: "",
  },
  owner: {
    firstName: "",
    lastName: "",
    ownerIdType: "GAMBIAN_NATIONAL_ID",
    ownerIdNumber: "",
  },
  account: {
    email: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
  },
});

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [application,setApplication]=useState<MerchantApplication|null>(null);
  const [session, setSession] = useState<MerchantSession | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const [loading, setLoading] = useState(true);
  useEffect(() => subscribeDemo(() => {
    setSession(isDemoMode() ? demoSession("MERCHANT") : null);
    setScreen(isDemoMode() ? "home" : "login");
  }), []);
  const [error, setError] = useState("");
  const [reg, setReg] = useState<RegistrationDraft>(emptyReg);

  const refreshSession = useCallback(async () => {
    const stored = await getSession();
    sessionRef.current=stored;
    setSession(stored);
    if (stored?.userStatus === "PENDING_REVIEW") {
      setScreen("pending");
    } else if (stored) {
      setScreen("home");
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isDemoMode()) await clearSession();
    setDemoMode(false);
    sessionRef.current=null;
    setApplication(null);
    setSession(null);
    setScreen("welcome");
  }, []);

  const persistSession = useCallback(async (stored: MerchantSession) => {
    await updateStoredSession(stored);
    sessionRef.current=stored;
    setSession(stored);
  }, []);

  useEffect(() => {
    bindTokenSession({
      getSession: () => sessionRef.current,
      updateSession: persistSession,
      clearSession: signOut,
    });
  }, [session, persistSession, signOut]);

  useEffect(() => {
    refreshSession().finally(async () => { if (!(await serverAvailable())) setDemoMode(true); setLoading(false); });
  }, [refreshSession]);

  const refreshApplication=useCallback(async()=>{
    if(!sessionRef.current||isDemoMode())return;
    const email=sessionRef.current.email;
    const value=await applicationApi.status();
    // Ignore a response belonging to a previous sign-in.
    const current=sessionRef.current;if(!current||current.email!==email)return;
    const updated={...current,businessName:value.businessName,userStatus:value.userStatus};
    sessionRef.current=updated;await updateStoredSession(updated);setSession(updated);setApplication(value);
    if(value.userStatus==="ACTIVE")setScreen(current=>current==="pending"?"home":current);
  },[]);
  useEffect(()=>{if(session&&!isDemoMode())void refreshApplication().catch(err=>setError(err instanceof Error?err.message:"Could not refresh application"));},[session?.email,refreshApplication]);
  useAutoRefresh(refreshApplication,!!session&&!isDemoMode());

  const value = useMemo<AppContextValue>(
    () => ({
      screen,
      setScreen,
      session,
      loading,
      error,
      setError,
      reg,
      updateReg: (patch) => setReg((prev) => ({ ...prev, ...patch })),
      resetReg: () => setReg(emptyReg()),
      refreshSession,
      application,refreshApplication,
      signIn: async (email, password, verification) => {
        setError("");
        const auth = await authApi.login(email.trim(), password, verification);
        if (auth.role !== "MERCHANT") {
          throw new Error("This app is for merchant accounts only");
        }
        assertVerifiedSession(auth);
        await saveSession(auth, "");
        await refreshSession();
      },
      signOut,
      completeRegistration: (businessName, userStatus) => {
        setScreen("verification");
      },
    }),
    [screen, session, loading, error, reg, refreshSession, signOut,application,refreshApplication],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
