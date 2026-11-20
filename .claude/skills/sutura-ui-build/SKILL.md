---
name: sutura-ui-build
description: Build, redesign or review Sutura interfaces (Next.js website + customer/merchant/developer/admin web dashboards, and the Expo customer, agent and merchant apps) with deliberate visual design, usable money workflows and ledger-backed API integration. Use for any Sutura frontend change, UI polish or UX review under sutura/ui.
---

# Sutura UI Build

Sutura is a double-entry-ledger payments platform: customer wallets, merchant collections and payment links, agent cash-in/cash-out, admin operations and developer integrations, with Sentinel for KYC and fraud. Build interfaces where people trust the numbers: balances, fees, statuses and receipts must be exact, legible and honest.

## Establish the brief

Work from the `sutura/` root. Read `AGENTS.md`, `ui/README.md`, and the design decisions already recorded: `docs/mobile-design.md`, `docs/native-mobile-ui.md`, `docs/role-ui-consistency.md`, `docs/more-settings-design.md`, `docs/role-app-workflows.md`, `docs/admin-workflows.md`, `docs/merchant-collections.md`. Check the real server controllers/DTOs in `server/` before trusting a doc. Read [surfaces.md](references/surfaces.md) for the audience you are building for.

Take designs and the quality bar from the zender workspace (`C:\Users\Mamadou\Downloads\zender`), especially for the mobile apps: `docs/design/redesign-research-2026-11.md` (Customer → customer app, Rider → agent app, Merchant → merchant app), `docs/design/mobile-density-research-2026-11.md`, and the primitives in `packages/ui/src` (bottom nav with SVG icons, sheets, status tone map, skeletons, keypad-first money entry, one sticky primary action). Adopt the patterns, keep Sutura's own brand rather than zender's navy/amber.

Existing brand decisions stand unless the user changes them: the Sutura logo (`ui/Sutura logo with vivid orange symbol.png`), Sutura orange as the single action accent, neutral white/charcoal surfaces, the customer app as the visual reference for agent and merchant. Record new decisions in `docs/` so later work follows them.

## Choose the design skills for the task

Load only what the change needs; do not stack every skill on every edit.

| Task | Skill |
| --- | --- |
| Visual direction for a new or reshaped screen | `frontend-design`, then `impeccable` for shaping/critique |
| Screen looks AI-generated (gradients, glows, emoji labels, hype copy, uneven spacing) | `unslop` |
| Native feel, sheets, materials, gestures on mobile | `apple-design` |
| Expo/React Native animation, haptics, gestures | `animate-expo` |
| Token, palette and contrast work | `better-colors`, `better-typography` |
| Layout, density, tables, responsive structure | `better-layout` |
| Surfaces, radii, icons, motion polish | `better-ui`, `emil-design-eng` |
| Labels, errors, empty states, confirmations, money copy | `better-writing` |
| Keyboard, focus, screen readers, forms | `better-accessibility`, `accessibility` |
| Next.js/React rendering, fetching, bundle size | `vercel-react-best-practices`, `performance`, `core-web-vitals` |
| Public marketing pages metadata | `seo` (never for authenticated pages) |
| Charts and KPI tiles in dashboards | `dataviz` |
| Ranked review of a finished screen | `better-interface` or `web-design-guidelines` |
| Review of a change set | `interface-review` |
| Stress-testing a component with worst-case data | `break-ui`, `state-machine` |
| Rendered verification | `playwright`, `screenshot` |

## Design and implement

- Money is the content. Amounts use tabular numerals, one currency format per screen, the currency always visible, and never sum different currencies. Fees and the amount the recipient gets are shown before confirmation.
- Statuses (pending, posted, reversed, failed, under review, KYC states) get one semantic tone map across all apps, always text + dot/shape, never colour alone. Chrome stays quiet; orange marks the primary action and selection only.
- Every money write is idempotent: keep the existing idempotency keys, disable repeat submission, keep progress inside the button, and never auto-replay a failed write. Show "check Activity before retrying" style recovery, not a silent retry.
- Include loading, empty vs no-results, validation, success with receipt, KYC-required, suspended account, expired session, offline/timeout (free-host cold starts) and recoverable error states. Never show sample balances when the API is unreachable.
- Web dashboards (customer, merchant, developer, admin, reconciliation): dense tables with right-aligned numbers, filters with visible state, row → detail, audit context on admin actions. Marketing pages: say what Sutura does for whom, show the real product, no invented customers or metrics.
- Mobile apps: follow `docs/mobile-design.md` — 52pt buttons, 44pt targets, safe areas, keyboard handling, Reduce Motion/Transparency, Light/Dark/System. Platform-appropriate, not platform-cosplay.
- Business rules, ledger postings, authorization and provider secrets stay in `server/`. Frontend permission checks shape navigation only.
- Accessibility baseline: semantic controls/`accessibilityRole`, labels, focus rings on web, 4.5:1 contrast in both themes, Dynamic Type/zoom not breaking layouts.

## Verify

Web: `npm run build` in `ui/web`. Mobile: TypeScript check and Expo web export per app. Render changed screens at 320/390/768 (mobile) and 1440 (web) in light and dark, inspect screenshots, and exercise keyboard paths, form errors and API failures. Browser checks do not prove native motion, haptics, camera or Dynamic Type; say so. Distinguish fixture screenshots from live-backend checks in your report.
