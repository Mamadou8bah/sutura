"use client";

import { useState } from "react";
import { authenticatedFetch, readAuthenticatedJson } from "../../../lib/authenticated-fetch";
import { Button, EmptyState, ErrorState, InlineAlert, PageHeading, Panel, SkeletonRows, StatusBadge, UpdatedAgo, fieldClass, useApiResource, useToast } from "../../components/ui";

type Ticket = { id: number; userId: number; subject: string; message: string; status: string; staffReply: string | null; version: number };

export function SupportDesk() {
  const [page, setPage] = useState(0);
  const tickets = useApiResource(
    async () => readAuthenticatedJson<Ticket[]>(await authenticatedFetch(`/api/v1/support/admin?page=${page}`)),
    [page],
  );
  const list = tickets.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeading
        title="Support"
        description="Requests from customers and agents. Reply, or reply and resolve."
        action={
          <>
            <UpdatedAgo at={tickets.loadedAt} />
            <Button variant="secondary" icon="refresh" onClick={() => void tickets.reload()} busy={tickets.refreshing} busyLabel="Refreshing">
              Refresh
            </Button>
          </>
        }
      />

      <Panel>
        {tickets.error && !tickets.data ? (
          <ErrorState title="Couldn't load support tickets" error={tickets.error} onRetry={() => void tickets.reload()} retrying={tickets.refreshing} />
        ) : !tickets.data ? (
          <SkeletonRows rows={4} label="Loading tickets" />
        ) : list.length === 0 ? (
          <EmptyState title={page === 0 ? "No support tickets" : "No tickets on this page"} icon="help">
            {page === 0 ? "New requests from the apps will appear here." : undefined}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((ticket) => (
              <TicketItem key={`${ticket.id}-${ticket.version}`} ticket={ticket} onSaved={() => tickets.reload()} />
            ))}
          </ul>
        )}
      </Panel>

      <nav aria-label="Ticket pages" className="flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm" icon="chevron-left" disabled={page === 0 || tickets.refreshing} onClick={() => setPage((v) => v - 1)}>
          Previous
        </Button>
        <span className="text-sm text-ink-2 tabular-nums">Page {page + 1}</span>
        <Button variant="secondary" size="sm" disabled={tickets.refreshing || list.length < 50} onClick={() => setPage((v) => v + 1)}>
          Next
        </Button>
      </nav>
    </div>
  );
}

function TicketItem({ ticket, onSaved }: { ticket: Ticket; onSaved: () => Promise<void> }) {
  const toast = useToast();
  const [draft, setDraft] = useState(ticket.staffReply ?? "");
  const [busy, setBusy] = useState<null | "save" | "resolve">(null);
  const [error, setError] = useState<string | null>(null);
  const replyId = `ticket-${ticket.id}-reply`;

  async function reply(resolved: boolean) {
    if (busy) return;
    if (!draft.trim()) {
      setError("Write a reply before saving.");
      return;
    }
    setBusy(resolved ? "resolve" : "save");
    setError(null);
    try {
      await readAuthenticatedJson<Ticket>(
        await authenticatedFetch(`/api/v1/support/admin/${ticket.id}`, {
          method: "PATCH",
          body: JSON.stringify({ message: draft, resolved, version: ticket.version }),
        }),
      );
      toast(resolved ? `Ticket #${ticket.id} resolved.` : `Reply saved on ticket #${ticket.id}.`, "success");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save reply.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">{ticket.subject}</h2>
          <p className="text-xs text-ink-2">
            Ticket #{ticket.id} · user #{ticket.userId}
          </p>
        </div>
        <StatusBadge status={ticket.status} />
      </div>
      <p className="whitespace-pre-wrap text-sm text-ink">{ticket.message}</p>
      <div className="space-y-1.5">
        <label htmlFor={replyId} className="block text-sm font-medium text-ink">
          Your reply
        </label>
        <textarea
          id={replyId}
          className={`${fieldClass} h-auto py-2`}
          maxLength={5000}
          rows={3}
          value={draft}
          disabled={busy !== null}
          onChange={(e) => setDraft(e.target.value)}
        />
      </div>
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" busy={busy === "save"} busyLabel="Saving" disabled={busy !== null} onClick={() => void reply(false)}>
          Save reply
        </Button>
        <Button busy={busy === "resolve"} busyLabel="Resolving" disabled={busy !== null} onClick={() => void reply(true)}>
          Reply and resolve
        </Button>
      </div>
    </li>
  );
}
