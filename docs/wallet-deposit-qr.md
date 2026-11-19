# Deposit QR on the customer home screen

The active wallet's balance card has a My QR action that opens a reusable
deposit code. Changing wallets changes the QR destination. Suspended/closed
wallets do not display a deposit QR. The Wallets list retains its compact layout.

## Counter flow

1. Customer selects the wallet and shows its code to a Sutura agent.
2. The agent app scans it and reads
   `GET /api/v1/agent/deposit-wallets/{walletId}`. Only active agents/admins can
   use this directory. It returns the active wallet, currency and customer
   identity, never the balance. Restricted owners/wallets are refused.
3. The cash-in form displays the server-resolved customer and wallet. Its phone
   and currency are fixed for that scan; the amount starts blank.
4. Agent enters the amount and reviews the customer, exact wallet and amount.
5. Explicit confirmation creates the cash deposit with `walletId`, `userId` and
   an idempotency key. The existing backend checks ownership and binds the
   request fingerprint to the wallet. It does not fall back to a primary wallet.
6. The agent completes the existing operation separately. Existing settlement
   compliance, ledger posting and receipt behavior remain in force.

QR data is versioned JSON with only `app`, `v`, `type: "wallet-deposit"` and
`walletId`. It is a public destination identifier, not an authorization token.
Embedded amounts, currencies, names and withdrawal instructions are ignored.
Scanning never creates or completes a deposit, and never starts a withdrawal.
Existing amount-bound cash-operation QR codes continue to work separately.

## Release and verification

Deploy the Sutura backend endpoint before publishing the customer and agent app
updates. No database migration or Sentinel change is needed for this feature.
Older agent apps understand operation-reference QR codes only.

- 15 focused backend tests pass, including nine new destination lookup cases
  and the existing agent/history/deposit-idempotency tests. The deposit
  integration test uses the isolated H2 test database; lookup cases use mocks.
- 50 customer/shared regression tests pass, including malformed/foreign/versioned
  QR rejection, identifier bounds and tampered-field handling.
- Customer and agent TypeScript checks and Expo web exports pass.
- Browser checks decode the actual rendered QR pixels, change wallets, decode
  the enlarged QR, and inspect light/dark at 320/390/768 pixels. Suspended-wallet
  codes are absent. Merely displaying the code performs no money write.
- A mocked agent flow uses the customer's decoded QR, injects fake amount,
  currency and owner fields, verifies that the scan only reads, enters a new
  amount, and checks the explicit create/complete requests. The deposit uses the
  scanned wallet ID and a stable request key. Unavailable wallets never create
  a request. These fixtures do not establish live settlement or camera acceptance.

Private fixture scripts/screenshots are in the parent workspace under
`.local-validation/deposit-qr`. A physical customer-phone/agent-phone scan and a
live cash-in rehearsal remain release acceptance checks.
