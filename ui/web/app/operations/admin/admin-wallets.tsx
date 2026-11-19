"use client";

import { useMemo, useState } from "react";
import { adminApi, type AdminWallet } from "../../../lib/admin-api";
import { Button, DetailList, Drawer, Money, PageHeading, Panel, StatusBadge, formatAmount, statusLabel, useApiResource } from "../../components/ui";
import { DataTable } from "../../dashboard/data-table";
import { ConfirmActionDrawer, FilterChip, IdEntry, useAdminNav, useStatusFilter } from "./admin-shared";

type PendingAction = { kind: "freeze" | "unfreeze"; walletId: number } | null;

export function AdminWallets({ action }: { action?: string }) {
  const nav = useAdminNav();
  const wallets = useApiResource(() => adminApi.listWallets(), []);
  const [statusFilter, clearStatus] = useStatusFilter();
  const [selected, setSelected] = useState<AdminWallet | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [typedId, setTypedId] = useState("");

  const rows = useMemo(() => {
    const all = wallets.data ?? [];
    return statusFilter ? all.filter((w) => w.status?.toUpperCase() === statusFilter.toUpperCase()) : all;
  }, [wallets.data, statusFilter]);

  const target = pending ? (wallets.data ?? []).find((w) => w.id === pending.walletId) ?? null : null;
  const frozen = (w: AdminWallet) => ["SUSPENDED", "FROZEN"].includes(w.status?.toUpperCase());

  const actionTitle = action === "freeze" ? "Freeze a wallet by ID" : action === "unfreeze" ? "Unfreeze a wallet by ID" : null;

  return (
    <div className="space-y-5">
      <PageHeading
        title="Wallets"
        description="Every customer, merchant and agent wallet with its ledger balance. Open a wallet to freeze or unfreeze it."
        action={
          action ? (
            <Button variant="secondary" icon="chevron-left" onClick={() => nav("wallets")}>
              All wallets
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => nav("wallets", "freeze")}>
                Freeze by ID
              </Button>
              <Button variant="secondary" onClick={() => nav("wallets", "unfreeze")}>
                Unfreeze by ID
              </Button>
            </>
          )
        }
      />

      {actionTitle ? (
        <Panel title={actionTitle} description="You'll see the wallet and confirm before anything changes.">
          <IdEntry
            label="Wallet ID"
            value={typedId}
            onChange={setTypedId}
            submitLabel="Review"
            onSubmit={() => {
              const id = Number(typedId);
              if (Number.isSafeInteger(id) && id > 0) setPending({ kind: action === "unfreeze" ? "unfreeze" : "freeze", walletId: id });
            }}
          />
        </Panel>
      ) : null}

      {statusFilter ? <FilterChip label={`Status: ${statusLabel(statusFilter)}`} onClear={clearStatus} /> : null}

      <DataTable<AdminWallet & Record<string, unknown>>
        title="All wallets"
        subtitle={wallets.data ? `${wallets.data.length} wallets` : undefined}
        exportFilename="sutura-admin-wallets"
        searchPlaceholder="Search owner, wallet ID or status"
        rows={rows as (AdminWallet & Record<string, unknown>)[]}
        rowKey={(r) => String(r.id)}
        loading={wallets.loading}
        error={wallets.error}
        onRefresh={() => void wallets.reload()}
        refreshing={wallets.refreshing}
        onRowClick={(r) => setSelected(r)}
        rowLabel={(r) => `Open wallet ${r.id}`}
        selectedKey={selected ? String(selected.id) : null}
        emptyTitle={statusFilter ? "No wallets with this status" : "No wallets yet"}
        emptyDescription={statusFilter ? "Clear the filter to see every wallet." : "Wallets appear here when people sign up."}
        columns={[
          { key: "id", label: "Wallet", sortValue: (r) => r.id, render: (r) => <span className="font-mono text-xs text-ink-2">#{r.id}</span> },
          {
            key: "ownerEmail",
            label: "Owner",
            sortValue: (r) => r.ownerEmail ?? "",
            render: (r) => (
              <div className="min-w-0">
                <div className="truncate font-medium text-ink">{r.ownerEmail}</div>
                <div className="truncate text-xs text-ink-2">{r.name}</div>
              </div>
            ),
          },
          {
            key: "balance",
            label: "Balance",
            align: "right",
            sortValue: (r) => Number(r.balance),
            render: (r) => <Money amount={r.balance} currency={r.currency} />,
            exportValue: (r) => formatAmount(r.balance, r.currency),
          },
          { key: "status", label: "Status", sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
          {
            key: "_actions",
            label: "Action",
            align: "right",
            searchValue: () => "",
            exportValue: () => "",
            render: (r) => (
              <Button
                size="sm"
                variant="secondary"
                icon={frozen(r) ? "unlock" : "lock"}
                onClick={(e) => {
                  e.stopPropagation();
                  setPending({ kind: frozen(r) ? "unfreeze" : "freeze", walletId: r.id });
                }}
              >
                {frozen(r) ? "Unfreeze" : "Freeze"}
              </Button>
            ),
          },
        ]}
      />

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Wallet #${selected.id}` : ""}
        subtitle={selected?.ownerEmail}
        footer={
          selected ? (
            <Button
              variant={frozen(selected) ? "secondary" : "danger"}
              icon={frozen(selected) ? "unlock" : "lock"}
              onClick={() => {
                setPending({ kind: frozen(selected) ? "unfreeze" : "freeze", walletId: selected.id });
                setSelected(null);
              }}
            >
              {frozen(selected) ? "Unfreeze wallet" : "Freeze wallet"}
            </Button>
          ) : null
        }
      >
        {selected ? (
          <DetailList
            items={[
              { label: "Balance", value: <Money amount={selected.balance} currency={selected.currency} />, emphasis: true },
              { label: "Status", value: <StatusBadge status={selected.status} /> },
              { label: "Wallet name", value: selected.name },
              { label: "Owner", value: selected.ownerEmail },
              { label: "Owner ID", value: <span className="font-mono text-xs">#{selected.ownerId}</span> },
              { label: "Currency", value: selected.currency },
            ]}
          />
        ) : null}
      </Drawer>

      <ConfirmActionDrawer
        open={pending?.kind === "freeze"}
        onClose={() => setPending(null)}
        title={`Freeze wallet #${pending?.walletId ?? ""}`}
        subtitle={target ? target.ownerEmail : "This wallet isn't in the loaded list. Check the ID before confirming."}
        context={
          target ? (
            <DetailList
              items={[
                { label: "Balance", value: <Money amount={target.balance} currency={target.currency} /> },
                { label: "Status", value: <StatusBadge status={target.status} /> },
              ]}
            />
          ) : null
        }
        impact={
          <>
            Freezing blocks sends, withdrawals and payments from this wallet until it is unfrozen.
            {target ? ` The balance of ${formatAmount(target.balance, target.currency)} stays on the ledger untouched.` : ""}
          </>
        }
        destructive
        confirmLabel="Freeze wallet"
        busyLabel="Freezing"
        successMessage={`Wallet #${pending?.walletId ?? ""} is frozen.`}
        onConfirm={async (reason) => {
          if (!pending) return;
          await adminApi.freezeWallet(pending.walletId, reason);
          setTypedId("");
          await wallets.reload();
        }}
      />

      <ConfirmActionDrawer
        open={pending?.kind === "unfreeze"}
        onClose={() => setPending(null)}
        title={`Unfreeze wallet #${pending?.walletId ?? ""}`}
        subtitle={target ? target.ownerEmail : "This wallet isn't in the loaded list. Check the ID before confirming."}
        context={
          target ? (
            <DetailList
              items={[
                { label: "Balance", value: <Money amount={target.balance} currency={target.currency} /> },
                { label: "Status", value: <StatusBadge status={target.status} /> },
              ]}
            />
          ) : null
        }
        impact="The owner can send, withdraw and pay from this wallet again. The unfreeze is recorded in the audit trail."
        requireReason={false}
        confirmLabel="Unfreeze wallet"
        busyLabel="Unfreezing"
        successMessage={`Wallet #${pending?.walletId ?? ""} is active again.`}
        onConfirm={async () => {
          if (!pending) return;
          await adminApi.unfreezeWallet(pending.walletId);
          setTypedId("");
          await wallets.reload();
        }}
      />
    </div>
  );
}
