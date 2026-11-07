# Sutura UI Workspace

This folder contains four frontend apps:

- `web`: Next.js website for the landing page, marketing site, admin area, and developer portal.
- `sutura-app`: Expo React Native app for consumer users.
- `sutura-agent`: Expo React Native app for agents.
- `merchant-app`: Expo React Native app for merchants.

## Mobile development (Expo SDK 58)

All three mobile apps use Expo 58, React Native 0.88 and React 19.3. Use Node
22.13+, 24.3+, or 26+ and run `npm ci` inside the app folder.

Run `npm start -- --clear` and scan the QR code with Expo Go for SDK 58.
Custom native controls use their fallback in Expo Go. Use
`npm run start:dev-client` with a development build for the full native integration.

SDK 53 APKs need a new SDK 58 APK; this upgrade cannot reach them over the air.
Production builds continue using the live backend. Native iOS builds require
iOS 16.4 or newer.

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

## Live backend connections

All apps require a real account and the configured Sutura API. Outages and
request timeouts show connection errors; they never open sample accounts or
create simulated balances, payments, agent operations or verification results.
Requests time out after 60 seconds to allow for free-host cold starts. Failed
writes are not replayed automatically: check Activity or the operation status
before retrying. A failed token refresh caused by an outage retains the session.
Old sample sessions are rejected and removed when encountered.

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
numbers. Use a registered customer phone number.
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

### Website authentication and role settings

The website requires live API authentication in development and production.
Preview credentials and the old demo-auth environment flag no longer grant
access. Admin and developer accounts use `/login`; customer and merchant users
use their mobile apps.

Agent and merchant Settings include account information, appearance, manual refresh, support, version information and sign-out confirmation. Merchant Hide balances is saved on the device. Language is English; it is displayed as information until translations are implemented.


## Onboarding and wallet screens

Login verification codes use a dedicated screen in each mobile app and a
separate website form. Credentials remain in the in-memory login draft; no
session is saved until verification succeeds. Back returns to sign-in.

Customer registration creates one zero-balance personal GMD wallet with its
ledger account and normal verification limits in the same transaction. Successful
customer login also provisions a missing GMD wallet for older accounts. Existing
wallet names and suspended status are preserved. Merchants retain the existing
approval-based collections-wallet process.

Additional customer wallets are created on the full `create-wallet` screen.
Currencies already owned are excluded. Wallet/currency selectors use branded
in-app sheets across Android, iOS and web instead of OS picker dialogs.
