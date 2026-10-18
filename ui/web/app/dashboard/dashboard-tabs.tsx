import type { DemoRole } from "../../lib/mock/demo-users";

type Tab = { id: string; label: string; icon: React.ReactNode };

function NavIcon({ children }: { children: React.ReactNode }) {
  return <span className="grid h-8 w-8 place-items-center rounded-full">{children}</span>;
}

const homeIcon = (
  <NavIcon>
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  </NavIcon>
);

export const adminTabs: Tab[] = [

  { id: "overview", label: "Home", icon: homeIcon },
  { id: "customers", label: "Customers", icon: <NavIcon>C</NavIcon> },
  { id: "merchants", label: "Merchants", icon: <NavIcon>M</NavIcon> },
  { id: "agents", label: "Agents", icon: <NavIcon>A</NavIcon> },
  { id: "identity", label: "Identity", icon: <NavIcon>ID</NavIcon> },
  { id: "deposits", label: "Cash-in", icon: <NavIcon>↓</NavIcon> },
  { id: "withdrawals", label: "Cash-out", icon: <NavIcon>↑</NavIcon> },
  { id: "collections", label: "Collections", icon: <NavIcon>QR</NavIcon> },

  { id: "wallets", label: "Wallets", icon: <NavIcon><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7.5h18v9H3v-9Z" /><path d="M16.5 12h3" /></svg></NavIcon> },
  { id: "transactions", label: "Payments", icon: <NavIcon><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 7h10M7 12h6M7 17h8" /><path d="M17 7l3 3-3 3" /></svg></NavIcon> },
  { id: "webhooks", label: "Webhooks", icon: <NavIcon><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v3M6.2 6.2l2.1 2.1M3 12h3" /></svg></NavIcon> },
  { id: "reconciliation", label: "Reconcile", icon: <NavIcon><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h10M4 17h14" /></svg></NavIcon> },
  { id: "risk", label: "Risk", icon: <NavIcon><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01" /><path d="M10.3 4.5h3.4L20 19H4L10.3 4.5Z" /></svg></NavIcon> },
  { id: "audit", label: "Audit", icon: <NavIcon><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13" /></svg></NavIcon> },
  { id: "support", label: "Support", icon: <NavIcon>?</NavIcon> },
];

export const merchantTabs: Tab[] = [
  { id: "overview", label: "Home", icon: homeIcon },
  { id: "wallets", label: "Wallets", icon: <NavIcon><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7.5h18v9H3v-9Z" /><path d="M16.5 12h3" /></svg></NavIcon> },
  { id: "money", label: "Money", icon: <NavIcon><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M7 8h10M7 16h6" /></svg></NavIcon> },
  { id: "payments", label: "Payments", icon: <NavIcon><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 8h16v8H4V8Z" /><path d="M4 11h16" /></svg></NavIcon> },
  { id: "links", label: "Links", icon: <NavIcon><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5" /><path d="M14 11a5 5 0 0 0-7.07 0L5.52 12.41a5 5 0 1 0 7.07 7.07L14 19" /></svg></NavIcon> },
  { id: "subscriptions", label: "Plans", icon: <NavIcon><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h10M4 17h14" /></svg></NavIcon> },
  { id: "webhooks", label: "Webhooks", icon: <NavIcon><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v3M18 12h3" /></svg></NavIcon> },
];

export const developerTabs: Tab[] = [
  { id: "overview", label: "Home", icon: homeIcon },
  { id: "keys", label: "API keys", icon: <NavIcon><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 11V8a5 5 0 0 1 9.9-1" /><path d="M8 11h8v8H8v-8Z" /></svg></NavIcon> },
  { id: "payments", label: "Payments", icon: <NavIcon><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 8h16v8H4V8Z" /><path d="M4 11h16" /></svg></NavIcon> },
  { id: "webhooks", label: "Integration", icon: <NavIcon><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v3M6.2 17.8l2.1-2.1" /></svg></NavIcon> },
];

export function getTabsForRole(role: DemoRole): Tab[] {
  switch (role) {
    case "admin":
      return adminTabs;
    case "merchant":
      return merchantTabs;
    case "developer":
      return developerTabs;
    case "customer":
      return [];
  }
}

export type DashboardTab = Tab;
