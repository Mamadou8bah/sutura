"use client";

import { useState } from "react";
import { adminApi, type AdminPayment, type PaymentRiskEvaluation } from "../../../lib/admin-api";
import { Button, DetailList, ErrorState, Icon, InlineAlert, Panel, Skeleton, StatusBadge, formatDateTime, useApiResource } from "../../components/ui";
import { humanize } from "./admin-shared";

export function RiskScore({ score }: { score: number | null | undefined }) {
  if (score == null || !Number.isFinite(Number(score)) || Number(score) < 0 || Number(score) > 1)
    return <span className="text-sm text-ink-3">Not scored</span>;
  return <span className="whitespace-nowrap tabular-nums">{(Number(score) * 100).toLocaleString("en-GB", { maximumFractionDigits: 1 })}<span className="ml-1 text-xs text-ink-3">/ 100</span></span>;
}

export function RiskDecision({ decision }: { decision?: string | null }) {
  const key = decision?.toLowerCase();
  return <StatusBadge tone={key === "block" ? "failed" : key === "review" ? "pending" : key === "allow" ? "posted" : "muted"}
    label={key === "block" ? "Blocked" : key === "review" ? "Held for review" : key === "allow" ? "Allowed" : decision ? humanize(decision) : "Not assessed"} />;
}

export function PaymentRiskDetails({ payment }: { payment: AdminPayment }) {
  const [page, setPage] = useState(0);
  const history = useApiResource(() => adminApi.getPaymentRisk(payment.id, page), [payment.id, page]);
  return <div className="space-y-4">
    <Panel title="Risk assessment" description="Sentinel’s decision is separate from the payment’s final status.">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <RiskDecision decision={payment.fraud?.decision} />
        <span className="text-2xl font-semibold"><RiskScore score={payment.fraud?.score} /></span>
      </div>
      {payment.failureReason && <div className="mb-4"><p className="text-xs font-medium text-ink-2">Payment failure reason</p><p className="mt-1 break-words text-sm leading-6 text-ink">{payment.failureReason}</p></div>}
      <p className="text-xs leading-5 text-ink-3">The score measures anomaly risk, not the probability that a person committed fraud. A service outage does not create a model score.</p>
    </Panel>
    {history.error ? <ErrorState title="Risk details unavailable" error={history.error} onRetry={() => void history.reload()} retrying={history.refreshing} />
      : !history.data ? <Skeleton className="h-36" />
      : history.data.evaluations.length === 0 ? <Panel title="No stored evaluation"><p className="text-sm leading-6 text-ink-2">No fraud evaluation was recorded for this payment. It may predate scoring, or have stopped before Sentinel returned a decision. Any payment failure reason is shown above.</p></Panel>
      : <section aria-label="Risk evaluation history" className="space-y-3">
        <h3 className="text-sm font-semibold text-ink">Evaluation history <span className="font-normal text-ink-3">({history.data.totalElements})</span></h3>
        {history.data.evaluations.map((evaluation, index) => <Evaluation key={evaluation.id} evaluation={evaluation} initiallyOpen={index === 0} />)}
        {history.data.totalPages > 1 && <nav aria-label="Risk history pages" className="flex items-center justify-between gap-2">
          <Button variant="secondary" size="sm" disabled={page === 0 || history.refreshing} onClick={() => setPage(p => p - 1)}>Newer</Button>
          <span className="text-xs text-ink-2">Page {page + 1} of {history.data.totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page + 1 >= history.data.totalPages || history.refreshing} onClick={() => setPage(p => p + 1)}>Older</Button>
        </nav>}
      </section>}
  </div>;
}

function Evaluation({ evaluation: e, initiallyOpen }: { evaluation: PaymentRiskEvaluation; initiallyOpen: boolean }) {
  const maxImpact = Math.max(...e.shapTopFeatures.map(f => Math.abs(f.contribution)), 0.001);
  return <details open={initiallyOpen} className="group rounded-card border border-line bg-surface">
    <summary className="flex min-h-12 cursor-pointer flex-wrap items-center justify-between gap-2 rounded-card p-4 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
      <span className="font-medium">{formatDateTime(e.evaluatedAt)}</span>
      <span className="flex items-center gap-3"><RiskDecision decision={e.decision} /><RiskScore score={e.score} /><Icon name="chevron-down" size={16} className="transition-transform group-open:rotate-180" /></span>
    </summary>
    <div className="space-y-4 border-t border-line p-4">
      {!e.detailsReadable && <InlineAlert tone="warning">Some stored explanation details could not be read.</InlineAlert>}
      <div><h4 className="text-sm font-semibold">Why this decision?</h4>
        {e.reasons.length ? <ul className="mt-2 list-disc space-y-2 break-words pl-4 text-sm leading-6 text-ink-2">{e.reasons.map((reason,i) => <li key={i}>{reason}</li>)}</ul>
          : <p className="mt-2 text-sm text-ink-2">No explanation was stored for this evaluation.</p>}
      </div>
      <DetailList items={[
        { label: "Triggered rule", value: e.ruleTriggered ? humanize(e.ruleTriggered) : "None recorded" },
        { label: "Provider", value: e.provider ? humanize(e.provider) : "Not recorded" },
        { label: "Sentinel transaction", value: e.providerTransactionId || "—" },
        { label: "Sentinel case", value: e.caseId || "—" },
      ]} />
      {e.shapTopFeatures.length ? <div>
        <h4 className="text-sm font-semibold">Model explanation</h4>
        <p className="mt-1 text-xs leading-5 text-ink-3">Positive contributions raise the model output; negative contributions lower it. Rules may also affect the final decision.</p>
        <ul className="mt-3 space-y-4" aria-label="Model feature contributions">
          {e.shapTopFeatures.map((feature,index) => <li key={`${feature.feature}-${index}`}>
            <div className="flex items-start justify-between gap-3 text-xs">
              <span className="min-w-0 break-words font-medium text-ink">{humanize(feature.feature)}{feature.value != null && <span className="ml-1 font-normal text-ink-3">({feature.value.toLocaleString("en-GB", {maximumFractionDigits: 4})})</span>}</span>
              <span className="shrink-0 tabular-nums text-ink-2">{feature.contribution > 0 ? "+" : ""}{feature.contribution.toLocaleString("en-GB", { maximumFractionDigits: 4 })}</span>
            </div>
            <div className="mt-2 h-1 rounded-full bg-surface-2" aria-hidden="true"><div className="h-1 rounded-full bg-ink-2" style={{ width: `${Math.abs(feature.contribution) / maxImpact * 100}%` }} /></div>
          </li>)}
        </ul>
      </div> : <p className="text-xs leading-5 text-ink-3">No model feature contributions were returned for this evaluation. The recorded reasons and rules are shown above.</p>}
    </div>
  </details>;
}
