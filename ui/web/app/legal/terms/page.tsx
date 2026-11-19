import type { Metadata } from "next";
import { ContentBlock, SitePage } from "../../site-page";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms that govern use of Sutura’s websites, developer tools, APIs, and related services.",
};

export default function TermsOfServicePage() {
  return (
    <SitePage
      title="Terms of service"
      description="The terms that govern use of Sutura’s websites, developer tools, APIs, and related services."
    >
      <ContentBlock title="Agreement">
        <p>
          By creating a Sutura account or using our APIs, dashboards, or documentation, you agree to these terms. If you
          use Sutura on behalf of a business, you confirm you are authorized to bind that business.
        </p>
      </ContentBlock>

      <ContentBlock title="Accounts and roles">
        <p>
          The Sutura web platform is intended for developers and administrators. Customer and merchant registration is
          handled through Sutura mobile apps. You are responsible for protecting credentials, API keys, and access to
          your organization.
        </p>
      </ContentBlock>

      <ContentBlock title="Acceptable use">
        <ul className="list-disc space-y-2 pl-5">
          <li>Do not attempt unauthorized access to wallets, APIs, or admin tools</li>
          <li>Do not use Sutura for unlawful, deceptive, or abusive activity</li>
          <li>Do not interfere with reconciliation, risk controls, or audit logging</li>
          <li>Keep integration traffic within rate limits and published API rules</li>
        </ul>
      </ContentBlock>

      <ContentBlock title="Payments and ledger records">
        <p>
          Sutura records money movement through wallet balances and ledger postings. Transaction outcomes depend on
          validation, risk checks, available balance, and operational status. Reversals and adjustments may be applied
          when required for corrections or dispute handling.
        </p>
      </ContentBlock>

      <ContentBlock title="Service changes">
        <p>
          We may update features, documentation, and these terms as the platform evolves. Continued use after an update
          means you accept the revised terms.
        </p>
      </ContentBlock>

      <ContentBlock title="Contact">
        <p>
          Questions about these terms can be sent through our{" "}
          <a href="/contact">
            contact page
          </a>
          .
        </p>
      </ContentBlock>

      <p className="text-sm text-ink-3">Last updated: August 23, 2026</p>
    </SitePage>
  );
}
