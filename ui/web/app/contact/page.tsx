import type { Metadata } from "next";
import { ContentBlock, SitePage } from "../site-page";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to Sutura about developer access, merchant onboarding or an operations rollout.",
};

export default function ContactPage() {
  return (
    <SitePage
      title="Contact"
      description="Talk to Sutura about developer access, merchant onboarding or an operations rollout."
    >
      <ContentBlock title="Who should contact us">
        <ul className="list-disc space-y-2 pl-5">
          <li>Developers integrating payment links, wallets, or webhooks</li>
          <li>Operators evaluating admin, risk, and reconciliation workflows</li>
          <li>Businesses planning merchant collections in The Gambia</li>
        </ul>
      </ContentBlock>

      <ContentBlock title="How to reach us">
        <p>
          Email{" "}
          <a href="mailto:sales@sutura.gm">
            sales@sutura.gm
          </a>{" "}
          with your company name, use case, and whether you need developer, admin, or merchant support.
        </p>
        <p>
          For technical documentation, start with the{" "}
          <a href="/docs">
            developer docs
          </a>
          .
        </p>
      </ContentBlock>

      <ContentBlock title="Quick links">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <a href="/signup">
              Create a developer account
            </a>
          </li>
          <li>
            <a href="/merchants/register">
              How merchant registration works
            </a>
          </li>
          <li>
            <a href="/help">
              Help center
            </a>
          </li>
        </ul>
      </ContentBlock>
    </SitePage>
  );
}
