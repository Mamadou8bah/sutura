import type { Metadata } from "next";
import { ContentBlock, SitePage } from "../../site-page";

export const metadata: Metadata = {
  title: "About Sutura",
  description: "Sutura is a payments platform for wallets, merchants, developers, and operators.",
};

export default function AboutPage() {
  return (
    <SitePage
      title="About Sutura"
      description="Sutura is a payments platform for wallets, merchants, developers, and operators."
    >
      <ContentBlock title="What we build">
        <p>
          Sutura connects customer checkout, merchant collections, free wallet-to-wallet transfers, developer APIs, and
          admin controls in one platform. The ledger is designed for clear balances, observable transactions, and
          operational review.
        </p>
      </ContentBlock>

      <ContentBlock title="Who it serves">
        <ul className="list-disc space-y-2 pl-5">
          <li>Customers moving money through wallet apps</li>
          <li>Merchants collecting through payment links and status updates</li>
          <li>Developers integrating APIs, keys, and webhooks on the web</li>
          <li>Admins monitoring risk, reconciliation, and audit activity</li>
        </ul>
      </ContentBlock>

      <ContentBlock title="Where we focus">
        <p>
          Sutura is built for payment operations where every balance must reconcile, with emphasis on reliability, role-based access, and tools
          that keep money movement understandable for both product teams and operators.
        </p>
      </ContentBlock>
    </SitePage>
  );
}
