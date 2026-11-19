import type { Metadata } from "next";
import { ContentBlock, SitePage } from "../../site-page";

export const metadata: Metadata = {
  title: "Integration guide",
  description: "A practical path for developers accepting payments with Sutura.",
};

export default function IntegrationGuidePage() {
  return (
    <SitePage
      title="Integration guide"
      description="A practical path for developers accepting payments with Sutura."
    >
      <ContentBlock title="1. Create a developer account">
        <p>
          Sign up on the web as a developer, then open the dashboard to create an API key for your backend.
        </p>
        <p>
          <a href="/signup">
            Create developer account
          </a>
        </p>
      </ContentBlock>

      <ContentBlock title="2. Create a payment from your server">
        <p>
          Use your API key from a trusted backend to create payment links or checkout sessions. Do not embed secret keys
          in client apps.
        </p>
      </ContentBlock>

      <ContentBlock title="3. Confirm with webhooks">
        <p>
          Subscribe to payment lifecycle events so your system learns when a payment is paid, failed, or needs follow-up.
          See{" "}
          <a href="/merchants/webhooks">
            webhook updates
          </a>{" "}
          and the{" "}
          <a href="/docs">
            API docs
          </a>
          .
        </p>
      </ContentBlock>

      <ContentBlock title="4. Test and go live">
        <p>
          Validate authentication, idempotent requests, and webhook signatures in a test environment before handling live
          money movement.
        </p>
      </ContentBlock>
    </SitePage>
  );
}
