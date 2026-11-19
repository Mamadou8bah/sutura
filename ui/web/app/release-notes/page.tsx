import type { Metadata } from "next";
import { ContentBlock, SitePage } from "../site-page";

export const metadata: Metadata = {
  title: "Release notes",
  description: "Product and platform updates for the Sutura web experience and APIs.",
};

export default function ReleaseNotesPage() {
  return (
    <SitePage
      title="Release notes"
      description="Product and platform updates for the Sutura web experience and APIs."
    >
      <ContentBlock title="November 2026">
        <ul className="list-disc space-y-2 pl-5">
          <li>Web redesign: Sutura orange as the single accent, the Manrope typeface and a dark theme</li>
          <li>Dashboards show loading and error states instead of sample data when the API is unavailable</li>
          <li>Payments ask you to review the amount, fee and recipient before sending, and show a receipt after</li>
          <li>The status page now checks the API live instead of showing a fixed message</li>
        </ul>
      </ContentBlock>

      <ContentBlock title="August 2026">
        <ul className="list-disc space-y-2 pl-5">
          <li>Web signup limited to developer accounts; customer and merchant onboarding remain in mobile apps</li>
          <li>Landing and dashboard mobile navigation improved for smaller screens</li>
          <li>Brand accent updated across marketing surfaces</li>
          <li>Legal, company, help, and status pages published on the web</li>
        </ul>
      </ContentBlock>

      <ContentBlock title="Earlier platform work">
        <ul className="list-disc space-y-2 pl-5">
          <li>Developer dashboard for API keys, payments, and webhooks</li>
          <li>Admin tools for wallets, reversals, risk, and reconciliation</li>
          <li>Docs and Swagger entry points for API integration</li>
        </ul>
      </ContentBlock>
    </SitePage>
  );
}
