import type { Metadata } from "next";
import { ContentBlock, SitePage } from "../../site-page";

export const metadata: Metadata = {
  title: "Reconciliation",
  description: "How Sutura checks wallet balances and provider deposits against its double-entry ledger.",
};

export default function ReconciliationPage() {
  return (
    <SitePage
      title="Reconciliation"
      description="How Sutura checks that wallet balances and provider deposits agree with the ledger."
    >
      <ContentBlock title="What gets checked">
        <ul className="list-disc space-y-2 pl-5">
          <li>Wallet-ledger: each wallet&apos;s balance against the sum of its ledger postings.</li>
          <li>Webhook-deposit: provider deposit callbacks against the wallet credits they should have produced.</li>
        </ul>
      </ContentBlock>

      <ContentBlock title="When something doesn't match">
        <p>
          A run records each mismatch with the expected value, the actual value and the difference. Sutura staff review
          it, make any correction, and resolve it with a written reason that is kept in the audit trail. Resolving a
          mismatch never edits the ledger by itself.
        </p>
      </ContentBlock>

      <ContentBlock title="Access">
        <div className="prose-links">
          <p>
            Reconciliation is available to Sutura admin accounts at{" "}
            <a href="/dashboard/reconciliation">Dashboard → Reconciliation</a>. For how data is protected, see{" "}
            <a href="/company/security">Security</a> and <a href="/company/compliance">Compliance</a>.
          </p>
        </div>
      </ContentBlock>
    </SitePage>
  );
}
