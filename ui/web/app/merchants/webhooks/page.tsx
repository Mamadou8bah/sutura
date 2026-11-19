import type { Metadata } from "next";
import { ContentBlock, SitePage } from "../../site-page";

export const metadata: Metadata = {
  title: "Webhook updates",
  description: "How Sutura notifies your systems when payment and collection statuses change.",
};

export default function MerchantWebhooksPage() {
  return (
    <SitePage
      title="Webhook updates"
      description="How Sutura notifies your systems when payment and collection statuses change."
    >
      <ContentBlock title="Why webhooks matter">
        <p>
          Polling is fragile for payment status. Webhooks let your backend react when a customer completes checkout, a
          payment fails, or a collection needs review.
        </p>
      </ContentBlock>

      <ContentBlock title="Common events">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-sm">payment.paid</code> — checkout completed
          </li>
          <li>
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-sm">payment.failed</code> — payment did not succeed
          </li>
          <li>Additional lifecycle events as your integration expands</li>
        </ul>
      </ContentBlock>

      <ContentBlock title="Next steps">
        <p>
          Developers configure webhook endpoints from the dashboard after creating an API key. Read the{" "}
          <a href="/developers/integration">
            integration guide
          </a>{" "}
          and{" "}
          <a href="/docs">
            docs
          </a>
          .
        </p>
      </ContentBlock>
    </SitePage>
  );
}
