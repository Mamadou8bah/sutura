"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { authApi } from "../lib/auth-api";
import { getDashboardPath, mapBackendRole, saveAuthSession } from "../lib/auth-session";
import { toE164Phone } from "../lib/merchant-registration";
import { AuthField, AuthShell, authInputClass } from "./auth-shell";
import { Button, friendlyError, Icon, InlineAlert } from "./components/ui";

/** Shows "still connecting" copy when a request runs long (free-host cold starts). */
function useSlowFlag(active: boolean, afterMs = 8000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const t = window.setTimeout(() => setSlow(true), afterMs);
    return () => window.clearTimeout(t);
  }, [active, afterMs]);
  return slow;
}

function SlowNotice() {
  return (
    <p role="status" className="text-sm text-ink-2">
      Still connecting. The server may be starting up, which can take up to a minute.
    </p>
  );
}

export function CombinedAuthPage({ initialMode = "login" }: { initialMode?: "login" | "signup" }) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [finishingSignup, setFinishingSignup] = useState(false);
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
  const slow = useSlowFlag(loading);
  const otpId = useId();
  const phoneId = useId();

  useEffect(() => {
    document.title = challengeId ? "Verify it's you · Sutura" : isLogin ? "Log in · Sutura" : "Create a developer account · Sutura";
  }, [challengeId, isLogin]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      if (challengeId && !/^[0-9]{6}$/.test(verificationCode)) throw new Error("Enter the six-digit verification code.");
      const auth = await authApi.login(email.trim(), password, challengeId ? { challengeId, code: verificationCode } : undefined);
      if (auth.twoFactorRequired && auth.twoFactorChallengeId) {
        setChallengeId(auth.twoFactorChallengeId);
        setVerificationCode("");
        return;
      }
      if (!auth.accessToken || !auth.refreshToken) throw new Error("Sign-in did not return a verified session.");
      const role = mapBackendRole(auth.role);
      if (role !== "admin" && role !== "developer") {
        setError(
          "Customer and merchant accounts can't log in on the web yet. Use the Sutura app on your phone, or contact support if you need web access.",
        );
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
      setError(friendlyError(err instanceof Error ? err.message : "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");

    if (signup.password !== signup.confirmPassword) {
      setError("The two passwords don't match. Type the same password in both fields.");
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
      if (auth.twoFactorRequired && auth.twoFactorChallengeId) {
        setFinishingSignup(true);
        setEmail(signup.email.trim());
        setPassword(signup.password);
        setChallengeId(auth.twoFactorChallengeId);
        setVerificationCode("");
        setMode("login");
        return;
      }
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
      setError(friendlyError(err instanceof Error ? err.message : "Registration failed"));
    } finally {
      setLoading(false);
    }
  }

  if (challengeId) {
    return (
      <AuthShell heading="Verify it's you" description="Enter the six-digit code we sent to your email. It expires in five minutes.">
        <form className="mt-6 space-y-4" onSubmit={handleLogin} noValidate>
          <div className="space-y-1.5">
            <label htmlFor={otpId} className="block text-sm font-medium text-ink">
              Verification code
            </label>
            <input
              id={otpId}
              className={`${authInputClass} text-center font-mono text-lg tracking-[0.3em]`}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              pattern="[0-9]{6}"
              required
              disabled={loading}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
            />
          </div>
          {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
          {slow ? <SlowNotice /> : null}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            busy={loading}
            busyLabel="Verifying"
            disabled={!/^[0-9]{6}$/.test(verificationCode)}
          >
            Verify and continue
          </Button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setChallengeId("");
              setVerificationCode("");
              setError("");
            }}
            className="inline-flex min-h-11 items-center gap-1 rounded-control text-sm font-semibold text-accent-ink"
          >
            <Icon name="chevron-left" size={16} />
            Back to log in
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      heading={isLogin ? "Log in to Sutura" : "Create a developer account"}
      description={
        isLogin
          ? "For developer and admin accounts. Customers and merchants use the Sutura app."
          : "Get API keys, take payments from your backend and manage webhooks."
      }
    >
      <div className="mt-6">
        {isLogin ? (
          <form className="space-y-4" onSubmit={handleLogin}>
            <AuthField
              label="Email or phone number"
              type="text"
              name="username"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
            />
            <AuthField
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
            />

            {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
            {slow ? <SlowNotice /> : null}

            <Button type="submit" size="lg" className="w-full" busy={loading} busyLabel="Logging in">
              Log in
            </Button>

            <p className="text-xs leading-5 text-ink-3">
              Forgot your password? Contact your Sutura administrator. After too many attempts, login is locked for 15 minutes.
            </p>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleSignup}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AuthField
                label="First name"
                type="text"
                name="given-name"
                autoComplete="given-name"
                value={signup.firstName}
                onChange={(e) => setSignup({ ...signup, firstName: e.target.value })}
                disabled={loading}
              />
              <AuthField
                label="Last name"
                type="text"
                name="family-name"
                autoComplete="family-name"
                value={signup.lastName}
                onChange={(e) => setSignup({ ...signup, lastName: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor={phoneId} className="block text-sm font-medium text-ink">
                Phone number
              </label>
              <div className="flex overflow-hidden rounded-control border border-line-strong bg-surface focus-within:border-accent-ink">
                <span className="flex items-center border-r border-line bg-surface-2 px-3 text-sm text-ink-2" aria-hidden="true">
                  +220
                </span>
                <input
                  id={phoneId}
                  className="h-12 min-w-0 flex-1 bg-transparent px-3 text-base text-ink placeholder:text-ink-3 sm:text-sm"
                  placeholder="7123456"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  aria-describedby={`${phoneId}-hint`}
                  value={signup.phoneLocal}
                  onChange={(e) => setSignup({ ...signup, phoneLocal: e.target.value.replace(/\D/g, "").slice(0, 7) })}
                  disabled={loading}
                  required
                />
              </div>
              <p id={`${phoneId}-hint`} className="text-xs text-ink-3">
                Seven digits, Gambian number (+220).
              </p>
            </div>

            <AuthField
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              value={signup.email}
              onChange={(event) => setSignup({ ...signup, email: event.target.value })}
              disabled={loading}
            />
            <AuthField
              label="Password"
              type="password"
              name="new-password"
              autoComplete="new-password"
              hint="At least 8 characters."
              value={signup.password}
              onChange={(event) => setSignup({ ...signup, password: event.target.value })}
              disabled={loading}
            />
            <AuthField
              label="Confirm password"
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              value={signup.confirmPassword}
              onChange={(event) => setSignup({ ...signup, confirmPassword: event.target.value })}
              disabled={loading}
            />

            {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
            {slow ? <SlowNotice /> : null}

            <Button type="submit" size="lg" className="w-full" busy={loading} busyLabel="Creating account">
              Create developer account
            </Button>

            <p className="text-xs leading-5 text-ink-3">
              Customers register in the Sutura app. Businesses can{" "}
              <Link href="/merchants/register" className="font-semibold text-accent-ink underline underline-offset-2">
                register as a merchant
              </Link>
              .
            </p>
          </form>
        )}

        <p className="mt-6 text-sm text-ink-2">
          {isLogin ? "Need a developer account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setError("");
              setMode(isLogin ? "signup" : "login");
            }}
            className="font-semibold text-accent-ink underline underline-offset-2"
          >
            {isLogin ? "Create one" : "Log in"}
          </button>
        </p>
      </div>
    </AuthShell>
  );
}
