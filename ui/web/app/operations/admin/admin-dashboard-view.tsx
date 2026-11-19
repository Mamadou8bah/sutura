"use client";

import { usePathname } from "next/navigation";
import { DashboardShell } from "../../dashboard/dashboard-shell";
import { adminTabs } from "../../dashboard/dashboard-tabs";
import { AdminAudit } from "./admin-audit";
import { AdminOverview } from "./admin-overview";
import { AdminReconciliation } from "./admin-reconciliation";
import { AdminRisk } from "./admin-risk";
import { useAdminNav } from "./admin-shared";
import { AdminTransactions } from "./admin-transactions";
import { AdminWallets } from "./admin-wallets";
import { AdminWebhooks } from "./admin-webhooks";
import { OperationsWorkspace, type OperationsKind } from "./operations-workspace";
import { SupportDesk } from "./support-desk";

const operationKinds: OperationsKind[] = ["customers", "merchants", "agents", "deposits", "withdrawals", "collections", "identity"];

/**
 * Admin and operations. Each section is its own component with its own state,
 * so typing in one form doesn't re-render the others. Routes:
 * /dashboard/<section>[/<record or action>].
 */
export function AdminDashboardView() {
  const pathname = usePathname();
  const nav = useAdminNav();
  const parts = pathname.split("/");
  const tab = parts[2] || "overview";
  const action = parts[3];

  return (
    <DashboardShell tabs={adminTabs} activeTab={tab} onTabChange={(id) => nav(id)}>
      {(operationKinds as string[]).includes(tab) ? <OperationsWorkspace key={tab} kind={tab as OperationsKind} /> : null}
      {tab === "overview" ? <AdminOverview /> : null}
      {tab === "wallets" ? <AdminWallets key={action ?? "list"} action={action} /> : null}
      {tab === "transactions" ? <AdminTransactions key={action ?? "list"} action={action} /> : null}
      {tab === "webhooks" ? <AdminWebhooks key={action ?? "list"} action={action} /> : null}
      {tab === "reconciliation" ? <AdminReconciliation /> : null}
      {tab === "risk" ? <AdminRisk /> : null}
      {tab === "audit" ? <AdminAudit /> : null}
      {tab === "support" ? <SupportDesk /> : null}
    </DashboardShell>
  );
}
