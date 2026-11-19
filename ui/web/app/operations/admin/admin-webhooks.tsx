"use client";

import { useState } from "react";
import { adminApi } from "../../../lib/admin-api";
import { InlineAlert, PageHeading, Panel } from "../../components/ui";
import { ConfirmActionDrawer, IdEntry } from "./admin-shared";

/**
 * The admin API has no webhook event list yet, so this section is an action
 * desk: enter the event ID from the provider log or the audit trail, review,
 * then confirm. Nothing is replayed automatically.
 */
export function AdminWebhooks({ action }: { action?: string }) {
  const [reprocessId, setReprocessId] = useState("");
  const [replayId, setReplayId] = useState("");
  const [pending, setPending] = useState<{ kind: "reprocess" | "replay"; id: number } | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const showReprocess = !action || action === "reprocess";
  const showReplay = !action || action === "replay";

  return (
    <div className="space-y-5">
      <PageHeading
        title="Webhooks"
        description="Reprocess or replay a provider callback by its event ID. Each action asks for a reason and is recorded in the audit trail."
      />

      <InlineAlert tone="info">
        Webhook events aren&apos;t listed by the API yet. Find the event ID in the provider dashboard or in the audit trail.
      </InlineAlert>

      {lastResult ? <InlineAlert tone="success">{lastResult}</InlineAlert> : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {showReprocess ? (
          <Panel title="Reprocess an event" description="Runs Sutura's handling of a stored callback again, for example after a fix.">
            <IdEntry
              label="Webhook event ID"
              value={reprocessId}
              onChange={setReprocessId}
              submitLabel="Review"
              onSubmit={() => {
                const id = Number(reprocessId);
                if (Number.isSafeInteger(id) && id > 0) setPending({ kind: "reprocess", id });
              }}
            />
          </Panel>
        ) : null}
        {showReplay ? (
          <Panel title="Replay a delivery" description="Asks the server to deliver the stored event again.">
            <IdEntry
              label="Webhook event ID"
              value={replayId}
              onChange={setReplayId}
              submitLabel="Review"
              onSubmit={() => {
                const id = Number(replayId);
                if (Number.isSafeInteger(id) && id > 0) setPending({ kind: "replay", id });
              }}
            />
          </Panel>
        ) : null}
      </div>

      <ConfirmActionDrawer
        open={pending?.kind === "reprocess"}
        onClose={() => setPending(null)}
        title={`Reprocess webhook #${pending?.id ?? ""}`}
        impact="If this event credits a deposit that was never posted, reprocessing can post it now. Check the deposit in Payments first so it isn't credited twice."
        confirmLabel="Reprocess event"
        busyLabel="Reprocessing"
        successMessage={`Webhook #${pending?.id ?? ""} marked for reprocessing.`}
        onConfirm={async (reason) => {
          if (!pending) return;
          await adminApi.reprocessWebhook(pending.id, reason);
          setLastResult(`Webhook #${pending.id} was marked for reprocessing.`);
          setReprocessId("");
        }}
      />

      <ConfirmActionDrawer
        open={pending?.kind === "replay"}
        onClose={() => setPending(null)}
        title={`Replay webhook #${pending?.id ?? ""}`}
        impact="The stored event is delivered again. Check the audit trail first if you're not sure whether it already succeeded."
        reasonLabel="Replay reason"
        confirmLabel="Replay delivery"
        busyLabel="Replaying"
        successMessage={`Replay requested for webhook #${pending?.id ?? ""}.`}
        onConfirm={async (reason) => {
          if (!pending) return;
          const result = await adminApi.replayWebhook(pending.id, reason);
          setLastResult(result?.message ? `Webhook #${pending.id}: ${result.message}` : `Replay requested for webhook #${pending.id}.`);
          setReplayId("");
        }}
      />
    </div>
  );
}
