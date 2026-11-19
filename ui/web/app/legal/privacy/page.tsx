import type { Metadata } from "next";
import { ContentBlock, SitePage } from "../../site-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Sutura collects, uses, and protects personal and business data across our web platform, APIs, and mobile apps.",
};

export default function PrivacyPolicyPage() {
  return (
    <SitePage
      title="Privacy policy"
      description="How Sutura collects, uses, and protects personal and business data across our web platform, APIs, and mobile apps."
    >
      <ContentBlock title="Who we are">
        <p>
          Sutura operates a digital payments platform for wallets, merchant collections, developer APIs, and
          administrative operations. This policy explains how we handle information when you use sutura.gm services,
          including the developer web console and related APIs.
        </p>
      </ContentBlock>

      <ContentBlock title="Information we collect">
        <p>Depending on how you use Sutura, we may collect:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Account details such as name, email, phone number, and role</li>
          <li>Business details for merchant onboarding and verification</li>
          <li>Transaction and wallet activity needed to move and reconcile money</li>
          <li>Technical logs such as IP address, device type, and API request metadata</li>
          <li>Support messages and sales inquiries you send us</li>
        </ul>
      </ContentBlock>

      <ContentBlock title="How we use information">
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide wallets, transfers, payment links, webhooks, and dashboards</li>
          <li>Authenticate users, enforce roles, and protect accounts</li>
          <li>Detect fraud, abuse, and operational risk</li>
          <li>Meet legal, audit, and reconciliation requirements</li>
          <li>Improve reliability, documentation, and support</li>
        </ul>
      </ContentBlock>

      <ContentBlock title="Sharing">
        <p>
          We do not sell personal data. We may share information with processors that help us run infrastructure,
          messaging, analytics, or compliance workflows, and when required by law or to protect Sutura, our users, or
          the public.
        </p>
      </ContentBlock>

      <ContentBlock title="Retention and security">
        <p>
          We retain account and ledger records for as long as needed to operate the service, resolve disputes, and meet
          regulatory obligations. Access is restricted by role, and sensitive actions are logged for audit.
        </p>
      </ContentBlock>

      <ContentBlock title="Your choices">
        <p>
          You can update account details, request access or correction where applicable, and contact us about privacy
          questions at{" "}
          <a href="/contact">
            Contact sales
          </a>
          .
        </p>
      </ContentBlock>

      <p className="text-sm text-ink-3">Last updated: August 23, 2026</p>
    </SitePage>
  );
}
