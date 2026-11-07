"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { clearAuthSession, getAuthSession } from "../../lib/auth-session";
import { clearDemoSession, getDemoSession } from "../../lib/demo-auth";
import type { DemoRole } from "../../lib/mock/demo-users";
import type { DashboardTab } from "./dashboard-tabs";

const roleLabels: Record<DemoRole, string> = {
  admin: "Admin",
  merchant: "Merchant",
  developer: "Developer",
  customer: "Customer",
};

export function DashboardShell({
  tabs,
  activeTab,
  onTabChange,
  children,
  message,
}: {
  tabs: DashboardTab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
  message?: { type: "success" | "error"; text: string } | null;
}) {
  const [session, setSession] = useState(() => getAuthSession() ?? getDemoSession());
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSession(getAuthSession() ?? getDemoSession());
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  function handleLogout() {
    clearAuthSession();
    clearDemoSession();
    window.location.href = "/login";
  }

  const isLive = session && "source" in session && session.source === "api";

  const initials = session?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const adminNavigation=session?.role === "admin";

  const activeLabel = tabs.find((t) => t.id === activeTab)?.label ?? "Menu";

  function selectTab(id: string) {
    onTabChange(id);
    setMenuOpen(false);
  }

  const mobileMenu =
    mounted &&
    createPortal(
      <div className={`fixed inset-0 z-[100000] md:hidden ${menuOpen ? "" : "pointer-events-none"}`} aria-hidden={!menuOpen}>
        <button
          type="button"
          className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-200 ${menuOpen ? "opacity-100" : "opacity-0"}`}
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
        <div
          className={`absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto border-t border-slate-200 bg-white transition-transform duration-300 ease-out ${
            menuOpen ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-black text-slate-900">All sections</p>
              <p className="text-xs font-medium text-slate-500">
                {session ? roleLabels[session.role] : "Dashboard"} · {isLive ? "Live" : "Demo"}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
            {tabs.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTab(item.id)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                    active
                      ? "border-orange-500 bg-orange-500 text-slate-950"
                      : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? "bg-white/20" : "bg-slate-100"}`}>
                    {item.icon}
                  </span>
                  <span className="text-sm font-bold leading-tight">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>,
      document.body,
    );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 w-[min(1440px,calc(100%-1rem))] items-center gap-3 px-2 sm:h-16 sm:px-3 lg:px-5">
          <a href="/" className="flex shrink-0 items-center gap-2">
            <img
              src="/brand/sutura-logo.png"
              alt="Sutura"
              className="h-8 w-8 object-contain"
            />
            <span className="text-base font-black tracking-tight text-[#123c91]">Sutura</span>
          </a>

          <nav className={`${adminNavigation?"md:hidden":"md:flex"} mx-auto hidden min-w-0 max-w-full items-center gap-1 overflow-x-auto rounded-full bg-slate-100 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
            {tabs.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.label}
                  onClick={() => onTabChange(item.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold transition-colors ${
                    active ? "bg-orange-500 text-slate-950" : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {session ? (
              <span className="hidden rounded-full bg-blue-100 px-3 py-1 text-xs font-bold capitalize text-[#123c91] lg:inline">
                {roleLabels[session.role]}
              </span>
            ) : null}
            <span
              className={`hidden rounded-full px-3 py-1 text-xs font-bold lg:inline ${
                isLive ? "bg-emerald-100 text-emerald-900" : "bg-orange-100 text-orange-900"
              }`}
            >
              {isLive ? "Live" : "Demo"}
            </span>
            <div
              className="grid h-9 w-9 place-items-center rounded-full bg-orange-500 text-[11px] font-black text-slate-950"
              title={session?.name}
            >
              {initials ?? "PF"}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Log out"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M10 7V6a2 2 0 0 1 2-2h7v16h-7a2 2 0 0 1-2-2v-1" />
                <path d="M15 12H3m0 0 3-3m-3 3 3 3" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom bar: current section + open full menu */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white md:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left"
            aria-expanded={menuOpen}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-[#123c91]">
              {tabs.find((t) => t.id === activeTab)?.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black text-slate-900">{activeLabel}</span>
              <span className="block text-[11px] font-semibold text-slate-500">Tap for all sections</span>
            </span>
            <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-slate-400" fill="currentColor" aria-hidden="true">
              <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
            </svg>
          </button>
        </div>
      </nav>

      {mobileMenu}

      {adminNavigation&&<aside aria-label="Admin navigation" className="fixed bottom-0 left-0 top-16 hidden w-56 overflow-y-auto border-r border-slate-200 bg-white p-4 md:block"><p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Workspace</p>{tabs.map(item=><button key={item.id} type="button" aria-label={item.label} aria-current={activeTab===item.id?"page":undefined} onClick={()=>onTabChange(item.id)} className={`mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold ${activeTab===item.id?"bg-amber-100 text-slate-950":"text-slate-600 hover:bg-slate-50"}`}>{item.icon}{item.label}</button>)}</aside>}
      <main className={`${adminNavigation?"md:ml-56 md:w-[calc(100%-14rem)]":"mx-auto w-[min(1440px,calc(100%-1rem))]"} overflow-x-clip px-4 pb-[5.5rem] pt-4 sm:px-6 sm:pt-5 md:pb-6 lg:px-8 lg:pt-6`}>
        {message ? (
          <div
            className={`mb-5 rounded-2xl px-4 py-3 text-sm font-semibold ${
              message.type === "success" ? "bg-emerald-200 text-emerald-950" : "bg-rose-200 text-rose-950"
            }`}
          >
            {message.text}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}

export function PanelCard({
  title,
  subtitle,
  action,
  children,
  className = "",
  variant = "default",
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "hero";
}) {
  if (variant === "hero") {
    return (
      <section
        className={`overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#123c91] via-[#1649a8] to-[#1e5bb8] p-5 text-white sm:rounded-[2rem] sm:p-6 ${className}`}
      >
        {children}
      </section>
    );
  }

  return (
    <section className={`rounded-[1.5rem] border border-slate-200 bg-white p-4 sm:rounded-[2rem] sm:p-5 md:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-black text-slate-950">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`h-12 w-full rounded-full bg-orange-500 text-sm font-black text-slate-950 transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-400 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`h-11 rounded-full bg-slate-200 px-5 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-300 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export const inputClass =
  "h-11 w-full rounded-2xl bg-slate-200 px-4 text-sm font-semibold text-slate-900 outline-none transition-colors focus:bg-white focus:ring-4 focus:ring-blue-200";

export const selectClass =
  "h-11 w-full rounded-2xl bg-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:ring-4 focus:ring-blue-200 sm:w-auto";

export const tableClass = "min-w-full text-left text-sm";
export const tableHeadClass = "bg-slate-200 text-slate-700";
export const tableRowClass = "odd:bg-white even:bg-slate-100";

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
