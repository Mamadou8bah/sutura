import type { Metadata } from "next";
import { ContentBlock, SitePage } from "../site-page";
import { ApiHealthCheck } from "./api-check";

export const metadata: Metadata = {
  title: "Service status",
  description: "Check whether the Sutura API is reachable from your browser right now.",
};

export default function StatusPage() {
  return (
    <SitePage
      title="Service status"
      description="A live check from your browser to the Sutura API. This page does not track history or incidents."
    >
      <ContentBlock title="Right now">
        <ApiHealthCheck />
      </ContentBlock>

      <ContentBlock title="What this check covers">
        <p>
          It asks the API&apos;s public health endpoint whether the service is up. It does not test individual payment
          flows, webhook delivery or the mobile apps, and the result is only what your browser can see.
        </p>
        <p>
          If something isn&apos;t working, read <a href="/help">Help</a> or <a href="/contact">contact us</a> with the time
          and what you were doing.
        </p>
      </ContentBlock>
    </SitePage>
  );
}
