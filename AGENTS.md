# Sutura workspace guidance

## Scope

Sutura is a double-entry-ledger payments platform. `server/` is the Spring Boot backend. `ui/` contains four frontends: `web` (Next.js: marketing site, customer/merchant/developer dashboards, admin operations), and the Expo apps `sutura-app` (customer), `sutura-agent` (agent) and `merchant-app` (merchant). KYC and fraud scoring come from the separate Sentinel API.

Product references: `README.md`, `ui/README.md`, `docs/role-app-workflows.md`, `docs/admin-workflows.md`, `docs/merchant-collections.md`, `docs/kyc-onboarding.md`, `docs/sentinel-integration.md`.

## UI work

For any frontend implementation, redesign or UI review, use the project skill `sutura-ui-build` (`.claude/skills/sutura-ui-build`). It defines each app's audience and jobs, the existing brand decisions, and which installed design skill to use for which task (`frontend-design`, `impeccable`, `unslop`, `apple-design`, `animate-expo`, `better-*`, `web-design-guidelines`, `dataviz`, `playwright`, ...). The skill setup is documented in `docs/ui-skills.md`; existing design decisions are in `docs/mobile-design.md`, `docs/native-mobile-ui.md` and `docs/role-ui-consistency.md`.

Use `C:\Users\Mamadou\Downloads\zender` as the design reference, especially for the mobile apps (`docs/design/`, `packages/ui/src`). Adopt its patterns, keep Sutura's brand.

Do not load every design skill on every change. Pick the specialist for the task.

## Boundaries

Keep ledger postings, business rules, authorization and provider secrets in `server/`. Preserve idempotency keys on every money write and never replay failed writes automatically. Never show sample balances when the API is unavailable. Verify rendered results at mobile and desktop widths in both themes; browser checks do not prove native behaviour, so report device checks separately.
