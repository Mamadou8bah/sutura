"use client";

import Link from "next/link";
import { useState } from "react";
import { authApi } from "../lib/auth-api";
import { clearAuthSession, getDashboardPath, mapBackendRole, saveAuthSession } from "../lib/auth-session";
import { authenticateDemoUser, DEMO_AUTH_ENABLED, getDemoDashboardPath, saveDemoSession } from "../lib/demo-auth";
import { toE164Phone } from "../lib/merchant-registration";
import { AuthField, AuthShell, DividerText, SocialButton } from "./auth-shell";


function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 6.75h16v10.5H4V6.75Z" />
      <path d="m4.5 7.5 7.5 5.25 7.5-5.25" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="m3 3 18 18" />
      <path d="M10.7 10.7a2 2 0 0 0 2.6 2.6" />
      <path d="M7.4 7.7C5.6 8.8 4.1 10.3 3 12c2.2 3.4 5.2 5.1 9 5.1 1.4 0 2.7-.2 3.8-.7" />
      <path d="M10.8 6.9c.4 0 .8-.1 1.2-.1 3.8 0 6.8 1.7 9 5.2-.5.8-1.1 1.5-1.8 2.1" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.38a4.6 4.6 0 0 1-1.99 3.02v2.74h3.22c1.89-1.74 2.99-4.3 2.99-7.75Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.42l-3.22-2.74c-.9.6-2.04.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12H3.07v2.83A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.67A6 6 0 0 1 6.08 12c0-.58.1-1.14.31-1.67V7.5H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.5l3.33-2.83Z" />
      <path fill="#EA4335" d="M12 6.21c1.47 0 2.79.51 3.83 1.5l2.86-2.86C16.96 3.24 14.7 2.25 12 2.25A10 10 0 0 0 3.07 7.5l3.33 2.83C7.19 7.97 9.4 6.21 12 6.21Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#1877F2]" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

const inputClass =
  "h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-500 focus:border-[#123c91] focus:ring-4 focus:ring-blue-100";

export function CombinedAuthPage({ initialMode = "login" }: { initialMode?: "login" | "signup" }) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [challengeId,setChallengeId]=useState("");
  const [verificationCode,setVerificationCode]=useState("");
  const [finishingSignup,setFinishingSignup]=useState(false);
  const [loading, setLoading] = useState(false);
  const [signup, setSignup] = useState({
    firstName: "",
    lastName: "",
    phoneLocal: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const isLogin = mode === "login";

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (DEMO_AUTH_ENABLED) {
        const demoUser = authenticateDemoUser(email, password);
        if (demoUser) {
          if (demoUser.role !== "admin" && demoUser.role !== "developer") {
            setError("Web login is for developer and admin accounts. Use the mobile apps for customer or merchant access.");
            return;
          }
          clearAuthSession();
          saveDemoSession(demoUser);
          window.location.href = getDemoDashboardPath(demoUser.role);
          return;
        }
      }

      if(challengeId&&!/^[0-9]{6}$/.test(verificationCode))throw new Error("Enter the six-digit verification code.");
      const auth = await authApi.login(email.trim(), password,challengeId?{challengeId,code:verificationCode}:undefined);
      if(auth.twoFactorRequired&&auth.twoFactorChallengeId){setChallengeId(auth.twoFactorChallengeId);setVerificationCode("");return;}
      if(!auth.accessToken||!auth.refreshToken)throw new Error("Sign-in did not return a verified session.");
      const role = mapBackendRole(auth.role);
      if (role !== "admin" && role !== "developer") {
        setError("Web login is for developer and admin accounts. Use the mobile apps for customer or merchant access.");
        return;
      }
      saveAuthSession({
        username: auth.username,
        role: auth.role,
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        userStatus: auth.userStatus,
      });
      window.location.href = finishingSignup && role === "developer" ? "/app/verification" : getDashboardPath(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (signup.password !== signup.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const auth = await authApi.register({
        firstName: signup.firstName.trim(),
        lastName: signup.lastName.trim(),
        phoneNumber: toE164Phone(signup.phoneLocal),
        email: signup.email.trim(),
        password: signup.password,
        role: "DEVELOPER",
      });
      if(auth.twoFactorRequired&&auth.twoFactorChallengeId){setFinishingSignup(true);setEmail(signup.email.trim());setPassword(signup.password);setChallengeId(auth.twoFactorChallengeId);setVerificationCode("");setMode("login");return;}
      saveAuthSession({
        username: signup.email.trim(),
        role: auth.role,
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        userStatus: auth.userStatus,
        firstName: signup.firstName.trim(),
        lastName: signup.lastName.trim(),
      });
      window.location.href = "/app/verification";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell heading={isLogin ? "Welcome back!" : "Create developer account"}>
      <div className="mt-5 sm:mt-6">
        {isLogin ? (
          <form className="space-y-3.5 sm:space-y-4" onSubmit={handleLogin}>

            <AuthField
              type="text"
              name="email"
              placeholder="Email or phone number"
              icon={<MailIcon />}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <AuthField
              type="password"
              name="password"
              placeholder="Enter your password"
              icon={<EyeOffIcon />}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            {challengeId&&<label className="block text-sm font-semibold">Verification code<input aria-label="Verification code" className={inputClass+" mt-2"} inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required value={verificationCode} onChange={e=>setVerificationCode(e.target.value.replace(/[^0-9]/g,"").slice(0,6))}/><span className="mt-2 block text-xs text-slate-500">Check your email or SMS. The code expires in five minutes.</span><button type="button" className="mt-2 text-sm underline" onClick={()=>{setChallengeId("");setVerificationCode("");}}>Start sign-in again</button></label>}
            {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

            <p className="text-xs text-slate-500">For account recovery, contact your Sutura administrator. Temporary login locks expire after 15 minutes.</p>

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-2xl bg-[#123c91] text-base font-black text-white transition-colors hover:bg-[#0d2f76] disabled:opacity-60 sm:h-14 sm:rounded-full"
            >
              {loading ? "Signing in…" : "Login"}
            </button>

          </form>
        ) : (
          <form className="space-y-3.5 sm:space-y-4" onSubmit={handleSignup}>
            <p className="text-sm leading-relaxed text-slate-600">
              Web signup is for developers. Create an account to get API keys, accept payments from your backend, and manage webhooks.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input className={inputClass} placeholder="First name" value={signup.firstName} onChange={(e) => setSignup({ ...signup, firstName: e.target.value })} required />
              <input className={inputClass} placeholder="Last name" value={signup.lastName} onChange={(e) => setSignup({ ...signup, lastName: e.target.value })} required />
            </div>

            <div className="flex overflow-hidden rounded-2xl border border-slate-300 bg-white">
              <span className="flex items-center bg-slate-100 px-3 text-sm font-bold text-slate-600 sm:px-4">+220</span>
              <input
                className="h-12 min-w-0 flex-1 px-3 text-base font-semibold outline-none sm:px-4 sm:text-sm"
                placeholder="712 3456"
                inputMode="numeric"
                value={signup.phoneLocal}
                onChange={(e) => setSignup({ ...signup, phoneLocal: e.target.value.replace(/\D/g, "").slice(0, 7) })}
                required
              />
            </div>

            <AuthField
              type="email"
              name="signup-email"
              placeholder="Email address"
              icon={<MailIcon />}
              value={signup.email}
              onChange={(event) => setSignup({ ...signup, email: event.target.value })}
            />
            <AuthField
              type="password"
              name="signup-password"
              placeholder="Password (min 8 characters)"
              icon={<EyeOffIcon />}
              value={signup.password}
              onChange={(event) => setSignup({ ...signup, password: event.target.value })}
            />
            <AuthField
              type="password"
              name="signup-confirm"
              placeholder="Confirm password"
              icon={<EyeOffIcon />}
              value={signup.confirmPassword}
              onChange={(event) => setSignup({ ...signup, confirmPassword: event.target.value })}
            />

            {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-2xl bg-[#123c91] text-base font-black text-white transition-colors hover:bg-[#0d2f76] disabled:opacity-60 sm:h-14 sm:rounded-full"
            >
              {loading ? "Creating account…" : "Create developer account"}
            </button>

            <p className="text-center text-xs leading-relaxed text-slate-500">
              Customers and merchants register in the Sutura mobile apps.{" "}
              <Link href="/merchants/register" className="font-bold text-[#123c91]">
                Merchant app info
              </Link>
            </p>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-slate-700 sm:mt-4 sm:text-base">
          {isLogin ? "Need a developer account?" : "Already have an account?"}{" "}
          <button type="button" onClick={() => setMode(isLogin ? "signup" : "login")} className="font-black text-[#123c91]">
            {isLogin ? "Sign up" : "Login"}
          </button>
        </p>
      </div>
    </AuthShell>
  );
}
