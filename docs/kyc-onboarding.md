# Hosted identity verification

Signed-in customers and merchants use Sutura's KYC API. Sutura sends its
Sentinel tenant API key server-side and uses the authenticated user ID, as a
string, for `externalCustomerId`. No endpoint accepts another user's ID or a
caller-supplied verification result.

## API

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/v1/kyc` | Read the caller's stored status, or `NOT_STARTED` |
| `POST /api/v1/kyc/sessions` | Start a Sentinel hosted session; reuse an unexpired pending or verified session |
| `POST /api/v1/kyc/refresh` | Retrieve only the caller's stored Sentinel session and persist its authoritative result |

Responses use the standard Sutura `ApiResponse` envelope. `data` contains
`status`, `sessionId`, `hostedUrl`, `explanation`, `expiresAt`, and `updatedAt`.
Possible local statuses are `NOT_STARTED`, `PENDING`, `EXPIRED`, `VERIFIED`,
`FLAGGED`, and `REJECTED`. Expiration applies only to an unfinished session.
Rejected or expired sessions can be restarted. Flagged sessions remain for
review; they cannot be silently replaced to discard a compliance decision.

The row is keyed by the Sutura user ID and records Sentinel session/customer
references and the latest result. Start/refresh operations lock the Sutura user
row to serialize concurrent calls for that account. The original Sentinel
sessions and compliance evidence remain in Sentinel; this is not a local
identity-image store or full KYC event history.

The client authenticates both session creation and polling. Responses must
match the expected external customer and session, use an HTTP(S) hosted URL,
and provide a recognised complete KYC result with valid face/liveness scores.
A verified result with zero evidence scores is rejected. Missing credentials,
HTTP errors and invalid responses return 503 without changing the previous
record. Attempts are logged without exposing API keys or identity evidence.

## Customer and merchant screen

Open `/app/verification` in the Sutura web client. Customers can reach it from
Profile > Verify your identity; live merchants have an owner-verification link
in their dashboard. The page creates a link on request, opens Sentinel in a
separate tab, and refreshes the result after submission. It polls on page load
when a session exists, while retaining the stored result on an outage.
Demo sessions do not submit identity verification.

Merchant owner identity and Sutura's business/account approval are separate.
A verified identity does not automatically approve a merchant application.

## Database and configuration

Use `SUTURA_SENTINEL_BASE_URL` and `SUTURA_SENTINEL_API_KEY`, as described in [the integration contract](sentinel-integration.md). Local development can use Hibernate updates. Production runs packaged Flyway migrations V1-V16 before Hibernate schema validation; see [Render deployment](deploy-render.md) for existing-schema adoption. The historical SQL files are upgrade references.

## Verification and remaining work

18 KYC tests cover authenticated identity mapping, link reuse/expiry,
verification outcomes, outages, missing sign-in, agent denial, tenant headers,
response ownership and invalid evidence/URLs. Existing fraud tests also pass.
The web client passes `tsc --noEmit` after fixing existing session and admin
data-mapping type errors. These checks do not replace a live two-system test.

New wallets start at LEVEL_0 using the existing baseline numerical caps.
Changing a wallet to a higher tier or raising caps above that baseline requires
a stored VERIFIED result. Spending from an elevated tier also checks the current
verification result; a stale tier cannot bypass verification. Missing/inactive
limits prevent spending. Existing LEVEL_1 wallets now need verification before
debiting; this is a deliberate behavior change. Verification does not raise
limits automatically.

Signed KYC callbacks now trigger an authoritative session fetch; polling remains
available. See [sentinel-integration.md](sentinel-integration.md) for signature,
tenant configuration and database upgrade instructions. Durable KYC event audit,
approved higher cap values and independently accepted identity artifacts remain outstanding.
Synthetic evidence still cannot grant a verified result.

## Mobile onboarding

The customer app now has a customer-registration form using `/api/auth/register`
with role `USER`. On success it stores the authenticated session and opens
identity verification. Existing customers use Profile → Verify your identity.

Merchant account completion opens owner verification. Returning to the account
uses the merchant's existing business approval status to choose the pending or
home screen. Both screens also offer owner verification. Identity verification
never changes business approval or makes pending collections available.

Both clients use their existing authenticated fetch and token-refresh path for
KYC. A stored result is shown before attempting a refresh; an outage preserves
that result. Verification links open in the browser; returning to the app
refreshes the result, and a manual refresh remains available. Flagged/verified
outcomes do not offer restart. Registration succeeds independently of Sentinel
availability, so an inference outage is not misreported as a signup failure.

Set each client's `EXPO_PUBLIC_API_BASE_URL` to a reachable Sutura API. For a
physical phone, localhost points to the phone, not the development computer.
Also set Sentinel's `SENTINEL_PUBLIC_BASE_URL` to the reachable hosted frontend
origin, because the verification URL is built by Sentinel. Native production
API origins require HTTPS. Use synthetic evidence only for this project.

Manual check: register a customer and a merchant; confirm the verification
screen opens; start and reopen the link; return and refresh; confirm rejected
synthetic evidence is not verified; stop Sentinel and confirm the previous
status remains visible; check a pending merchant stays pending after returning.
These checks need running backends and have not been exercised on a device.

Mobile validation: both Expo apps pass `tsc --noEmit` and export their web
bundles successfully. Validation exports are under each app’s ignored
`.expo/kyc-validation` directory and use an example API origin; they are build
checks, not a deployed or live-backend demonstration.

Automatic onboarding now queues a hosted session after verified contact/merchant submission. A durable worker retries outages; opening the verification screen also starts or reuses the session. Developer account owners can verify their integration identity. Changing owner identity in a merchant correction invalidates the prior local result and restarts onboarding. The queue never grants verification itself.
