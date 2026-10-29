# Sutura UI Workspace

This folder contains four frontend apps:

- `web`: Next.js website for the landing page, marketing site, admin area, and developer portal.
- `sutura-app`: Expo React Native app for consumer users.
- `sutura-agent`: Expo React Native app for agents.
- `merchant-app`: Expo React Native app for merchants.

## Mobile app updates

All three APKs support EAS Update once linked to real Expo projects. Pushes to
`main` publish compatible code and asset updates through GitHub Actions. See
[automatic Android updates](../docs/mobile-updates.md) for the required Expo IDs,
GitHub secret, initial APK build and device verification. Native changes still
require a new APK.

## Logo

The original artwork is `Sutura logo with vivid orange symbol.png`.
Each Expo app bundles an unchanged copy as `assets/sutura-logo.png`, referenced
by its `SUTURA_LOGO` brand constant. The website serves its copy from
`web/public/brand/sutura-logo.png`. Customer PDF receipts use the bundled asset too.
When replacing the artwork, update all four copies together.

## Automatic offline demo

The three mobile apps check server availability at startup. Connection failures,
five-second timeouts and HTTP server errors open an account named Demo User.
Invalid credentials and other HTTP client errors keep the normal login error.

Demo wallets start with GMD 12,500. Transfers, cash operations and support tickets
are simulated in memory; no demo requests reach the backend. Use a reference
starting with `DEMO-` when exploring the agent lookup screen. Customer identity
verification includes a local sample-document and sample-selfie walkthrough.
It does not upload evidence, run identity models or change the real KYC status.
Actual verification requires the live server. Demo sessions and changes are discarded when leaving
demo mode; real saved credentials are not replaced with demo credentials.

Sign out and sign in again after restarting the server to return to your account.
Real writes interrupted by an outage are never replayed as demo successes:
check their actual status after signing in again. Demo operations are simulations.

Validate the shared fallback implementation from `ui/sutura-app`:

```bash
node --test tests/*.test.cjs
```

## Customer appearance and input

The customer app supports **Light**, **Dark** and **System** in Settings. The choice is saved on the device; light is the initial default.
System follows device appearance changes. Screens, forms, charts and sheets use
the active palette. QR codes retain a white scan area.

Login has separate email and phone tabs. Registration validates names, optional
email, phone and password length before sending. Amount fields accept positive
decimals with up to four fractional digits; recipient fields accept phone input.
Wallet currency uses a selector. Transfers show a review step before confirmation,
including the complete submitted amount when it has four decimal places.

## Web

```bash
cd ui/web
npm install
npm run dev
```

## Sutura App

```bash
cd ui/sutura-app
npm install
npx expo start
```

## Sutura Agent

```bash
cd ui/sutura-agent
npm install
npx expo start
```


Customer transfers use the recipient’s registered phone number (`recipientPhone`),
not a wallet ID. Seven-digit Gambian numbers default to +220; international numbers
can include + or 00 followed by their country code. The server resolves an active
recipient wallet in the sending currency and rejects unknown, ambiguous or own
numbers. In offline demo mode, use **+220 700 0002** as the sample recipient.
Internal payment-link collection requests continue to use destination wallet IDs.

### Agent and merchant appearance

The agent and merchant mobile clients follow the customer app's typography,
neutral surfaces, orange actions and form controls. Both offer Light, Dark and
System appearance in Settings; login has no appearance selector. See
[role UI alignment](../docs/role-ui-consistency.md) for scope and validation.

Merchant collection, wallet, payment activity and agent history workflows are documented in [role-app-workflows](../docs/role-app-workflows.md).

### Automatic refresh

Customer wallet/activity data, agent operation history and merchant balances/collections/activity refresh every 30 seconds while the signed-in app is visible. Returning to the app or focusing the browser also refreshes these reads. Background tabs pause polling; payment writes and form drafts are not replayed or reset. Manual refresh remains available. Expo development servers provide Fast Refresh for source edits.

Agent and merchant login use the same email/phone tabs and validation as customer login. Merchant onboarding keeps its five stages with a compact stage counter and progress bars. Agent accounts are provisioned by Sutura; there is no public agent self-registration endpoint.

All three mobile apps bundle Inter (regular, medium, semibold and bold) through Expo Google Fonts. Shared theme font tokens and default text/input styles use Inter.

### Website demo and role settings

With `npm run dev` in `ui/web`, open `http://localhost:3000/login` and enter the demo credentials: `admin@sutura.local` or `developer@sutura.local`, password `demo123`. Local demo login is enabled in development unless `NEXT_PUBLIC_ENABLE_DEMO_AUTH=false`; production builds always disable it. Admin sample wallets, transfers, webhooks, risk flags, reconciliation records and audit logs can be explored. Support replies/resolution and risk checks run locally; no model is run for sample risk checks. Sample changes reset when the dashboard reloads. Signing in with demo credentials explicitly replaces any saved live website session.

Agent and merchant Settings include account information, appearance, manual refresh, support, version information and sign-out confirmation. Merchant Hide balances is saved on the device. Language is English; it is displayed as information until translations are implemented.
