# Merchant and agent workflows

The merchant app now has Home, Collections, Activity and More tabs, using the public app's typography, amber actions, neutral surfaces and persisted light/dark/system appearance.

## Merchant

- Create an amount-specific payment QR using an active owned wallet, up to four decimal places, an optional description and a 1/7/30 day expiry.
- Show and share the server-issued collection reference; customer Scan resolves that reference on the server before payment confirmation.
- List collections by All, Active, Paid or Review and explicitly check the latest payment status. Only active collections show a payable QR.
- View each business wallet separately, select the dashboard wallet and create wallets in supported currencies. Balances in different currencies are never added together.
- Search and filter incoming/outgoing payment history, open transaction details and share their actual status.
- Open identity verification, appearance settings, support tickets/replies and sign out from account navigation.

## Agent

The authenticated GET `/api/v1/agent/operations` endpoint reads only operations assigned to the signed-in agent (most recent 100 deposits and 100 withdrawals). Responses include creation and completion timestamps. Activity loads from this endpoint after sign-in and supports refresh; today's counts use completion dates instead of session increments. Completion updates deduplicate references. Existing cash creation, lookup, review and completion continue to use server validation and settlement endpoints. Phone input is normalized before customer lookup.

Live scanned pending references are saved per signed-in agent on the device and revalidated with the server after restarting. Only references are stored; failed restoration keeps the stored references for a later retry. Demo queues remain temporary. History is bounded and is not a complete accounting export.

## Validation and remaining live checks

- All three mobile projects pass TypeScript checks; agent and merchant Expo web exports succeed.
- 24 public/shared UI tests and the merchant dashboard regression pass.
- Five backend agent history/customer lookup tests pass; backend compilation succeeds.
- Local Chromium exercises agent completion, merchant collection creation/status refresh, wallet creation, login rendering, and light/dark/system appearance at 320, 390 and 768 pixel widths without page errors or horizontal overflow.

Demo operations are local to each app instance and reset when demo mode resets. A QR created in one offline demo app cannot settle in another offline demo app. Real cross-app payment, native camera scanning, identity provider and payment-provider checks require a running backend, configured services and device testing. No new provider credentials or trained models are supplied by these UI changes.

Cash-out security (20 November): agents cannot create withdrawals for a customer
by phone or user ID. The owner creates the cash-out and displays a rotating,
server-issued QR. Its 30-second capability can be scanned once. The resulting
90-second approval is bound to the scanning agent and required at completion.
Raw references cannot authorise a withdrawal. See `agent-cash-out-security.md`.
