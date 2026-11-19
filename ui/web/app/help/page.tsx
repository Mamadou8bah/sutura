import type { Metadata } from "next";
import { ContentBlock, SitePage } from "../site-page";

export const metadata: Metadata = {
  title: "Help",
  description: "Answers for Sutura customers, merchants, developers and operations staff.",
};

export default function HelpCenterPage() {
  return (
    <SitePage title="Help" description="Answers for customers, merchants, developers and operations staff.">
      <ContentBlock title="Developers">
        <p>
          Create a developer account on the web to manage API keys and review payments. Start with the{" "}
          <a href="/docs">developer docs</a> and the <a href="/developers/integration">integration guide</a>.
        </p>
      </ContentBlock>

      <ContentBlock title="Customers">
        <p>
          Customer wallets are opened in the Sutura app. To verify your identity you&apos;ll need a valid ID document and
          a phone that can take a photo.
        </p>
      </ContentBlock>

      <ContentBlock title="Merchants">
        <p>
          Businesses register in the Sutura Merchant app with a phone number, business details and the owner&apos;s ID.
          The app isn&apos;t in the app stores yet; <a href="/contact">contact us</a> to join the merchant rollout, and
          read <a href="/merchants/register">how merchant registration works</a>.
        </p>
      </ContentBlock>

      <ContentBlock title="Operations staff">
        <p>
          Admins log in with an existing operations account. Read{" "}
          <a href="/operations/reconciliation">how reconciliation works</a>.
        </p>
      </ContentBlock>

      <ContentBlock title="Still stuck">
        <p>
          <a href="/contact">Contact us</a> with the reference on your receipt, if you have one, and what you were trying
          to do. You can also <a href="/status">check whether the API is reachable</a>.
        </p>
      </ContentBlock>
    </SitePage>
  );
}
