import type { Metadata } from "next";
import { ContentBlock, SitePage } from "../../site-page";

export const metadata: Metadata = {
  title: "Security",
  description: "How Sutura protects accounts, APIs, wallets, and operational access.",
};

export default function SecurityPage() {
  return (
    <SitePage
      title="Security"
      description="How Sutura protects accounts, APIs, wallets, and operational access."
    >
      <ContentBlock title="Access controls">
        <p>
          Web access is limited to developer and admin roles. Sessions use authenticated tokens, and privileged
          operations are restricted by role. API keys are scoped for server-side integrations.
        </p>
      </ContentBlock>

      <ContentBlock title="Operational safeguards">
        <ul className="list-disc space-y-2 pl-5">
          <li>Wallet freeze and unfreeze controls for incident response</li>
          <li>Risk flags and review workflows for suspicious activity</li>
          <li>Audit logs for administrative actions</li>
          <li>Rate limiting and request validation on API surfaces</li>
        </ul>
      </ContentBlock>

      <ContentBlock title="Reporting">
        <p>
          If you believe you have found a security issue, contact us through the{" "}
          <a href="/contact">
            contact page
          </a>{" "}
          with enough detail for us to reproduce and prioritize the report.
        </p>
      </ContentBlock>
    </SitePage>
  );
}
