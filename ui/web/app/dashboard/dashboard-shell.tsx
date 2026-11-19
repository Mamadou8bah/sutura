"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { clearAuthSession, getAuthSession } from "../../lib/auth-session";
import { clearDemoSession, getDemoSession } from "../../lib/demo-auth";
import type { DemoRole } from "../../lib/mock/demo-users";
import { Icon, InlineAlert, ThemeToggle } from "../components/ui";
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
  /** Inline banner. Prefer useToast() for success and inline errors next to the action. */
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const activeLabel = tabs.find((t) => t.id === activeTab)?.label ?? "Dashboard";

  // Functional page title per view.
  useEffect(() => {
    const role = session ? roleLabels[session.role] : "Dashboard";
    document.title = `${activeLabel} · ${role} · Sutura`;
  }, [activeLabel, session]);

  function handleLogout() {
    clearAuthSession();
    clearDemoSession();
    window.location.href = "/login";
  }

  const initials = session?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebarNavigation = session?.role === "admin";

  function selectTab(id: string) {
    onTabChange(id);
    setMenuOpen(false);
  }

  const mobileMenu =
    mounted &&
    createPortal(
      <div className={`fixed inset-0 z-[100000] md:hidden ${menuOpen ? "" : "pointer-events-none"}`} aria-hidden={!menuOpen} inert={!menuOpen}>
        <button
          type="button"
          tabIndex={-1}
          className={`absolute inset-0 bg-black/45 transition-opacity duration-200 ${menuOpen ? "opacity-100" : "opacity-0"}`}
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="All sections"
          className={`absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-panel border-t border-line bg-surface transition-transform duration-300 ease-out ${
            menuOpen ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-base font-semibold text-ink">All sections</p>
              <p className="text-xs text-ink-2">{session ? `${roleLabels[session.role]} · ${session.name}` : "Dashboard"}</p>
            </div>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-control text-ink-2 hover:bg-surface-2"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <Icon name="x" />
            </button>
          </div>

          <nav aria-label="Sections" className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
            {tabs.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTab(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-row border px-3 py-2.5 text-left transition-colors ${
                    active ? "border-accent bg-accent-tint text-ink" : "border-line bg-surface text-ink hover:bg-surface-2"
                  }`}
                >
                  <span className={active ? "text-accent-ink" : "text-ink-2"}>{item.icon}</span>
                  <span className="text-sm font-medium leading-tight">{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="flex items-center justify-between border-t border-line px-4 py-3">
            <span className="text-sm text-ink-2">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a href="#main" className="sr-only-focusable fixed left-2 top-2 z-[100002] rounded-control bg-surface px-3 py-2 text-sm font-semibold shadow-pop">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
        <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex shrink-0 items-center gap-2 rounded-control" aria-label="Sutura home">
            <img src="/brand/sutura-logo.png" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
            <span className="text-base font-semibold text-ink">Sutura</span>
          </a>
          {session ? (
            <span className="hidden rounded-full border border-line px-2 py-0.5 text-xs text-ink-2 sm:inline">{roleLabels[session.role]}</span>
          ) : null}

          <nav
            aria-label="Sections"
            className={`${sidebarNavigation ? "md:hidden" : "md:flex"} mx-auto hidden min-w-0 max-w-full items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
          >
            {tabs.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => onTabChange(item.id)}
                  className={`relative flex h-14 shrink-0 items-center gap-2 px-3 text-sm font-medium transition-colors ${
                    active ? "text-ink" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  <span className={active ? "text-accent-ink" : ""}>{item.icon}</span>
                  <span>{item.label}</span>
                  {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ThemeToggle className="hidden md:inline-flex" />
            <div
              className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-ink"
              title={session?.name}
              aria-hidden="true"
            >
              {initials ?? "?"}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-9 items-center gap-1.5 rounded-control px-2 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <Icon name="logout" size={18} />
              <span className="hidden sm:inline">Log out</span>
              <span className="sr-only sm:hidden">Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom bar: current section + full menu */}
      <nav
        aria-label="Section menu"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="px-3 py-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex w-full min-w-0 items-center gap-3 rounded-row border border-line bg-surface-2 px-3 py-2 text-left"
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
          >
            <span className="text-accent-ink">{tabs.find((t) => t.id === activeTab)?.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{activeLabel}</span>
              <span className="block text-xs text-ink-2">All sections</span>
            </span>
            <Icon name="chevron-up" size={18} className="text-ink-3" />
          </button>
        </div>
      </nav>

      {mobileMenu}

      {sidebarNavigation ? (
        <aside aria-label="Admin navigation" className="fixed bottom-0 left-0 top-14 hidden w-56 overflow-y-auto border-r border-line bg-surface p-3 md:block">
          <nav aria-label="Sections" className="space-y-0.5">
            {tabs.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => onTabChange(item.id)}
                  className={`flex h-9 w-full items-center gap-2.5 rounded-control px-2.5 text-left text-sm transition-colors ${
                    active ? "bg-accent-tint font-semibold text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  <span className={active ? "text-accent-ink" : ""}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>
      ) : null}
      <main
        id="main"
        className={`${sidebarNavigation ? "md:ml-56 md:w-[calc(100%-14rem)]" : "mx-auto w-full max-w-[1440px]"} overflow-x-clip px-4 pb-24 pt-5 sm:px-6 md:pb-10 lg:px-8 lg:pt-6`}
      >
        {message ? (
          <div className="mb-5">
            <InlineAlert tone={message.type === "success" ? "success" : "error"}>{message.text}</InlineAlert>
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
  headingLevel = "h2",
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** @deprecated the gradient hero was removed; "hero" renders as a default panel. */
  variant?: "default" | "hero";
  headingLevel?: "h1" | "h2";
}) {
  void variant;
  const H = headingLevel;
  return (
    <section className={`rounded-card border border-line bg-surface p-4 shadow-card sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title ? <H className="text-base font-semibold text-ink">{title}</H> : null}
            {subtitle ? <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function PrimaryButton({ children, busy, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-accent text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-control border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export const inputClass =
  "h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-3 transition-colors focus:border-accent-ink disabled:opacity-60 aria-[invalid=true]:border-status-failed-fg";

export const selectClass =
  "h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink transition-colors focus:border-accent-ink sm:w-auto";

export const tableClass = "min-w-full text-left text-[13px] tabular-nums";
export const tableHeadClass = "border-y border-line bg-surface-2/60 text-xs text-ink-2";
export const tableRowClass = "border-b border-line";

export function formatTimestamp(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(d);
}
