"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, ThemeToggle } from "./components/ui";

export type LandingNavGroup = {
  label: string;
  links: Array<{ label: string; href: string }>;
};

export function LandingHeader({ groups }: { groups: LandingNavGroup[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) setMobileOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Escape closes whichever menu is open and returns focus to its trigger.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (openGroup) {
        const trigger = navRef.current?.querySelector<HTMLButtonElement>(`[data-group="${openGroup}"]`);
        setOpenGroup(null);
        trigger?.focus();
      }
      if (mobileOpen) {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openGroup, mobileOpen]);

  // Click outside closes the desktop menu.
  useEffect(() => {
    if (!openGroup) return;
    function onDown(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openGroup]);

  const mobileMenu =
    mounted &&
    createPortal(
      <div className={`fixed inset-0 z-[100000] md:hidden ${mobileOpen ? "" : "pointer-events-none"}`} aria-hidden={!mobileOpen} inert={!mobileOpen}>
        <button
          type="button"
          tabIndex={-1}
          className={`absolute inset-0 bg-black/45 transition-opacity duration-200 ${mobileOpen ? "opacity-100" : "opacity-0"}`}
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={`absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-line bg-surface transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
            <p className="text-base font-semibold text-ink">Menu</p>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-control text-ink-2 hover:bg-surface-2"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            >
              <Icon name="x" />
            </button>
          </div>

          <nav aria-label="Site" className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            {groups.map((group) => (
              <div key={group.label} className="mb-4">
                <h2 className="px-3 py-2 text-sm font-semibold text-ink-2">{group.label}</h2>
                <ul className="space-y-0.5">
                  {group.links.map((link) => (
                    <li key={`${group.label}-${link.label}`}>
                      <a
                        href={link.href}
                        className="block rounded-control px-3 py-3 text-base font-medium text-ink hover:bg-surface-2"
                        onClick={() => setMobileOpen(false)}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-ink-2">Theme</span>
              <ThemeToggle />
            </div>
          </nav>

          <div className="shrink-0 space-y-2 border-t border-line p-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            <a
              href="/signup"
              className="flex h-12 items-center justify-center rounded-control bg-accent text-base font-semibold text-accent-on hover:bg-accent-hover"
              onClick={() => setMobileOpen(false)}
            >
              Open an account
            </a>
            <a
              href="/login"
              className="flex h-12 items-center justify-center rounded-control border border-line-strong text-base font-semibold text-ink hover:bg-surface-2"
              onClick={() => setMobileOpen(false)}
            >
              Log in
            </a>
          </div>
        </aside>
      </div>,
      document.body,
    );

  return (
    <header className="sticky top-0 z-[9999] border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <a href="#main" className="sr-only-focusable fixed left-2 top-2 z-[100002] rounded-control bg-surface px-3 py-2 text-sm font-semibold shadow-pop">
        Skip to content
      </a>
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <a href="/" className="flex shrink-0 items-center gap-2 rounded-control" aria-label="Sutura home">
          <img src="/brand/sutura-logo.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
          <span className="text-lg font-semibold text-ink">Sutura</span>
        </a>

        <nav ref={navRef} aria-label="Site" className="mx-auto hidden items-center gap-1 text-sm font-medium text-ink-2 md:flex">
          {groups.map((group) => {
            const open = openGroup === group.label;
            const menuId = `nav-${group.label.toLowerCase()}`;
            return (
              <div key={group.label} className="relative">
                <button
                  type="button"
                  data-group={group.label}
                  className={`flex h-9 items-center gap-1 rounded-control px-3 transition-colors hover:bg-surface-2 hover:text-ink ${open ? "bg-surface-2 text-ink" : ""}`}
                  aria-expanded={open}
                  aria-controls={menuId}
                  onClick={() => setOpenGroup(open ? null : group.label)}
                >
                  {group.label}
                  <Icon name={open ? "chevron-up" : "chevron-down"} size={14} className="text-ink-3" />
                </button>
                {open ? (
                  <div
                    id={menuId}
                    className="absolute left-1/2 top-full z-[10000] mt-2 w-60 -translate-x-1/2 rounded-card border border-line bg-surface p-1.5 shadow-pop"
                  >
                    <ul>
                      {group.links.map((link) => (
                        <li key={link.label}>
                          <a
                            href={link.href}
                            className="block rounded-control px-3 py-2 text-sm text-ink transition-colors hover:bg-surface-2"
                            onClick={() => setOpenGroup(null)}
                          >
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="hidden lg:inline-flex" />
          <a className="hidden h-10 items-center rounded-control px-3 text-sm font-semibold text-ink hover:bg-surface-2 sm:inline-flex" href="/login">
            Log in
          </a>
          <a
            className="hidden h-10 items-center rounded-control bg-accent px-4 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover sm:inline-flex"
            href="/signup"
          >
            Open an account
          </a>
          <button
            ref={menuButtonRef}
            type="button"
            className="grid h-10 w-10 place-items-center rounded-control text-ink hover:bg-surface-2 md:hidden"
            aria-expanded={mobileOpen}
            aria-haspopup="dialog"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <Icon name={mobileOpen ? "x" : "menu"} />
          </button>
        </div>
      </div>
      {mobileMenu}
    </header>
  );
}
