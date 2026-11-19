"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getAuthSession, type AppSession } from "../../lib/auth-session";
import { getDemoSession } from "../../lib/demo-auth";
import { DashboardLoadingSkeleton } from "../components/sutura-loader";

// Each role downloads only its own dashboard.
const loading = () => <DashboardLoadingSkeleton />;
const CustomerAppView = dynamic(() => import("../app/customer-app-view").then((m) => m.CustomerAppView), { ssr: false, loading });
const AdminDashboardView = dynamic(() => import("../operations/admin/admin-dashboard-view").then((m) => m.AdminDashboardView), { ssr: false, loading });
const DeveloperDashboardView = dynamic(() => import("./developer-dashboard-view").then((m) => m.DeveloperDashboardView), { ssr: false, loading });
const MerchantDashboardView = dynamic(() => import("./merchant-dashboard-view").then((m) => m.MerchantDashboardView), { ssr: false, loading });

function readSession(): AppSession | null {
  if (typeof window === "undefined") return null;
  const auth = getAuthSession();
  if (auth) return auth;
  const demo = getDemoSession();
  if (!demo) return null;
  return { ...demo, source: "demo" };
}

export function DashboardView() {
  const [session, setSession] = useState<AppSession | null>(readSession);
  const [ready, setReady] = useState(() => typeof window !== "undefined");

  useEffect(() => {
    setSession(readSession());
    setReady(true);
  }, []);

  if (!ready || !session) {
    return <DashboardLoadingSkeleton />;
  }

  switch (session.role) {
    case "admin":
      return <AdminDashboardView />;
    case "merchant":
      return <MerchantDashboardView />;
    case "developer":
      return <DeveloperDashboardView />;
    case "customer":
      return <CustomerAppView />;
  }
}
