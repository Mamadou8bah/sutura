import type { DemoRole } from "../../lib/mock/demo-users";
import { Icon, type IconName } from "../components/ui";

type Tab = { id: string; label: string; icon: React.ReactNode };

const tab = (id: string, label: string, icon: IconName): Tab => ({ id, label, icon: <Icon name={icon} size={18} /> });

export const adminTabs: Tab[] = [
  tab("overview", "Today", "home"),
  tab("customers", "Customers", "users"),
  tab("merchants", "Merchants", "store"),
  tab("agents", "Agents", "agent"),
  tab("identity", "Identity", "id"),
  tab("deposits", "Cash-in", "arrow-in"),
  tab("withdrawals", "Cash-out", "arrow-out"),
  tab("collections", "Collections", "qr"),
  tab("wallets", "Wallets", "wallet"),
  tab("transactions", "Payments", "card"),
  tab("webhooks", "Webhooks", "webhook"),
  tab("reconciliation", "Reconciliation", "scale"),
  tab("risk", "Risk", "alert"),
  tab("audit", "Audit", "list"),
  tab("support", "Support", "help"),
];

export const merchantTabs: Tab[] = [
  tab("overview", "Overview", "home"),
  tab("wallets", "Wallets", "wallet"),
  tab("money", "Move money", "repeat"),
  tab("payments", "Payments", "card"),
  tab("links", "Payment links", "link"),
  tab("subscriptions", "Plans", "list"),
  tab("webhooks", "Webhooks", "webhook"),
];

export const developerTabs: Tab[] = [
  tab("overview", "Overview", "home"),
  tab("keys", "API keys", "key"),
  tab("payments", "Payments", "card"),
  tab("webhooks", "Integration", "webhook"),
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
