import type { Metadata } from "next";
import { ContentBlock, SitePage } from "../../site-page";

export const metadata: Metadata = {
  title: "Compliance",
  description: "Sutura’s approach to accountable money movement, auditability, and operational controls.",
};

export default function CompliancePage() {
  return (
    <SitePage
      title="Compliance"
      description="Sutura’s approach to accountable money movement, auditability, and operational controls."
    >
      <ContentBlock title="Ledger accountability">
        <p>
          Transfers and collections are recorded so balances and postings can be reviewed. Reconciliation tools help
          operators investigate mismatches and keep records aligned with expected activity.
        </p>
      </ContentBlock>

      <ContentBlock title="Controls">
        <ul className="list-disc space-y-2 pl-5">
          <li>Role-based access for developers and administrators</li>
          <li>Audit trails for sensitive admin actions</li>
          <li>Risk review paths for flagged activity</li>
          <li>Merchant onboarding flows handled in the merchant app</li>
        </ul>
      </ContentBlock>

      <ContentBlock title="Ongoing work">
        <p>
          Compliance requirements evolve with product scope and local operating rules. Sutura continues to strengthen
          verification, monitoring, and documentation as the platform expands.
        </p>
      </ContentBlock>
    </SitePage>
  );
}
