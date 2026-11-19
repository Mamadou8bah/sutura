# Simple mobile direction — 19 November 2026

The user explicitly asked for the restraint of the reviewed wallet references,
across the customer, agent and merchant apps. This direction supersedes the tall
stacked home QR card and the earlier grid of boxed home actions.

## References inspected

- [YouPay by Mark Velmiskin](https://www.behance.net/gallery/154350049/YouPay-Wallet-App):
  inspected the overview image. Its balance-led hierarchy and short action row
  inform our layout. Its photographic background and brand assets are not used.
- [PocketPal](https://www.behance.net/gallery/197846977/PocketPal-E-Wallet-App-UI-Design):
  inspected the dashboard/transactions image. Its separation of balance, actions
  and history informs grouping. Sutura does not adopt its purple palette, charts,
  promotions or virtual cards.
- [IME Pay by Lollypop Design](https://www.behance.net/gallery/91357363/IME-Pay-First-digital-wallet-of-Nepal):
  reviewed the role-specific customer/agent/business case study and QR imagery.
  Its clear task hierarchy and explicit QR instructions inform the counter flow.

Behance's live search route returned an access error in both the research tool
and Chrome. Individual indexed case studies and their public image CDN supplied
the references above. Saved reference images stay private in the parent
workspace's `.local-validation/behance-reference` directory.

## Decisions applied

- Customer: one compact wallet card, balance and deposit QR together, short
  deposit instruction, then three shortcuts and recent activity. The code opens
  a larger view. At narrow widths its size adapts; larger text can reflow rather
  than being truncated. The wallet selector has no redundant internal divider.
- Agent: one daily summary with totals separated by currency. Remove redundant
  cash-in/cash-out counters and zero pending indicators. Show pending work only
  when present, with an action to open the queue. Two borderless shortcuts lead
  to cash-in/cash-out. Explanatory details remain in the forms and review step.
- Merchant: one balance, two borderless actions and recent payments. Remove the
  role subtitle, redundant wallet link and always-visible empty collection
  counters. Unpaid/review requests appear only when present. Refresh is a header
  action; errors remain visible with recovery controls.
- Empty history states have no extra enclosing card. Flat shortcut symbols,
  white/charcoal surfaces and orange primary actions remain. No new decorative
  effects or animations are added. Amounts, fees, statuses, review confirmations
  and failure recovery remain functional requirements.

## Verification scope

Run all three TypeScript checks and Expo web exports, the customer/shared
regressions, responsive home checks at 320/390/768 in both themes, and actual
pixel decoding of the compact/enlarged deposit QR. Browser fixtures verify
navigation and payloads without live money movement. Native camera, screen reader
and Dynamic Type acceptance still need physical devices.

Completed checks: all three TypeScript checks and web exports pass; 50 existing
customer/shared tests pass. Browser checks cover all three homes in both themes
at 320/390/768, enlarged web text, focus and first-action navigation. The compact
and enlarged deposit QRs decode from actual rendered pixels and retain the
existing agent create/review/complete flow. Additional non-empty fixtures confirm
separate GMD/USD agent totals, the pending-queue link, conditional merchant
requests and visible refresh errors with the last balance retained.

Current clean home screenshots are private under `.local-validation/simple-mobile`
and `.local-validation/deposit-qr` in the parent workspace. They use fixtures,
not live account balances. The code changes have not been published.
