# Sutura surfaces

## Customer app — `ui/sutura-app` (Expo) and `ui/web/app/app`

Users: individuals with Sutura wallets, mostly on mid/low-end Android phones. Jobs: see balance, send, top up, withdraw via agent, pay merchants by QR, review activity and receipts, complete KYC verification, manage wallets, security and support. The visual reference for the other apps.

Design for: balance and the next action first, short confirm flows with fee and recipient visible, receipts people can share, honest pending/under-review states from Sentinel.

## Agent app — `ui/sutura-agent` (Expo)

Users: cash agents serving walk-in customers at a counter, interrupted often. Jobs: cash-in (deposit), cash-out (withdrawal), look up and confirm the customer, scan QR, work the queue, see session totals and float.

Design for: speed and error prevention. Large keypad-friendly inputs, explicit customer confirmation before money moves, clear completed vs pending, totals per currency.

## Merchant app — `ui/merchant-app` (Expo) and `ui/web/app/dashboard` (merchant view)

Users: small business owners and staff. Jobs: register and verify the business, collect payments (QR, payment links), see balance and collections, settlements, activity.

Design for: "did I get paid" answered instantly, collection tools one tap away, registration as clear steps with saved progress.

## Developer dashboard — `ui/web/app/dashboard` (developer view), `ui/web/app/developers`, `docs`

Users: integrators. Jobs: API keys, webhooks, logs, docs, sandbox. Design for: copyable values, monospace for keys/IDs, clear environment labels, no secrets shown twice.

## Admin and operations — `ui/web/app/operations` (admin, reconciliation)

Users: Sutura staff. Jobs: user/merchant/agent review, KYC and settlement reviews, reconciliation, ledger inspection, audit.

Design for: actionable queues, dense tables, ledger postings shown as balanced debit/credit, every sensitive action with reason and audit trail.

## Marketing website — `ui/web/app` (landing, company, customers, merchants, help, legal, status, pay)

Users: prospective customers, merchants, developers, assessors. Jobs: understand what Sutura is, pick their role, sign up or log in, pay a payment link. Design for: plain headlines, the real product as the visual, one primary action, true claims only.
