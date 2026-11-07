"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession, type AppSession } from "../../lib/auth-session";
import type { DemoRole } from "../../lib/mock/demo-users";
import { SuturaLoader } from "./sutura-loader";

export type SessionInfo = AppSession | { email: string; role: DemoRole; name: string; source: "demo" };

export function getActiveSession(): SessionInfo | null {
  return getAuthSession();
}

export function AuthGate({
  role,
  children,
}: {
  role?: DemoRole;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "allowed" | "redirecting">("checking");

  useEffect(() => {
    const session = getActiveSession();

    if (!session) {
      setStatus("redirecting");
      router.replace("/login");
      return;
    }

    if (role && session.role !== role) {
      setStatus("redirecting");
      router.replace("/dashboard");
      return;
    }

    setStatus("allowed");
  }, [role, router]);

  if (status === "allowed") {
    return <>{children}</>;
  }

  if (status === "redirecting") {
    return (
      <SuturaLoader
        message="Redirecting"
        submessage={role ? "Taking you to the right place…" : "Taking you to sign in…"}
      />
    );
  }

  return (
    <SuturaLoader
      message="Checking your session"
      submessage="Securing your dashboard…"
    />
  );
}
