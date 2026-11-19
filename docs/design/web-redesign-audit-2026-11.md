# Sutura web redesign audit — November 2026

Read-only audit of `ui/web` (Next.js 15, Tailwind 3). No source files were changed. Method: `sutura-ui-build` brief and surfaces, the recorded decisions in `docs/role-ui-consistency.md`, `docs/mobile-design.md` and `docs/ui-review-2026-10-10.md`, the unslop sign list and passes, `frontend-design`, the Web Interface Guidelines and Vercel React rules. The zender design system (`C:\Users\Mamadou\Downloads\zender`, `docs/design/redesign-research-2026-11.md` and `packages/ui/src`) is the pattern reference. Sutura's own brand stays.

The audit is code-only. Nothing was rendered, so no screenshot was taken at 320/390/768/1440. Run those checks during implementation. Contrast ratios below were calculated from hex values with the WCAG formula.

All paths are relative to `ui/web/` unless they say otherwise.

## 0. Systemic findings (all areas)

These root causes explain most of the per-area findings.

- **The web does not use Sutura orange.** `tailwind.config.ts:18-30` remaps the whole `orange` scale to gold (`orange-500` and `orange-600` are both `#debb30`), so every `bg-orange-*` and `text-orange-*` in the app renders gold. The logo (`public/brand/sutura-logo.png`) and all three mobile apps use `#f97316` (`ui/sutura-app/src/theme.ts:10`, `ui/sutura-agent/src/theme.ts:10`, `ui/merchant-app/src/theme.ts:10`).
- **There is a second accent.** Navy `#123c91` appears 89 times. It is used for the wordmark, links, the primary customer buttons, gradients, chart colour and the loader, and `app/layout.tsx:19` sets `themeColor: "#123c91"`. The brand calls for one orange accent.
- **The config is stale.** `tailwind.config.ts:11-17` defines a dark navy and teal theme (`bg #07111f`, `accent #4fd1c5`) and `fontFamily.sans: Roboto` (`:33-34`). `app/globals.css:26-213` holds unused legacy classes (`.hero`, `.panel`, `.eyebrow`, `.hero-actions` with a teal gradient at `:143`, `.panel.accent` gradient at `:175`). No TSX file uses them.
- **Headings are too heavy.** `app/globals.css:20-22` sets every heading to weight 800, and the code uses `font-black` 71 times. Space Grotesk, loaded at `app/layout.tsx:4-7`, is a variable font that stops at 700, so these all render at 700 and hierarchy comes from weight instead of size.
- **Uppercase tracked labels appear 41 times.** Examples: `app/page.tsx:280`, `app/site-page.tsx:19`, `app/dashboard/dashboard-toolbar.tsx:97`, and every `Field` label (`merchant-dashboard-view.tsx:22`, `developer-dashboard-view.tsx:19`, `admin-dashboard-view.tsx:46`, `customer-app-view.tsx:265`).
- **Numbers are not tabular.** `tabular-nums` appears 0 times. Amounts are pre-formatted strings, left-aligned in tables.
- **There is no dark theme.** `dark:` appears 0 times and `app/globals.css:7` sets `color-scheme: light`. The mobile apps support Light, Dark and System (`docs/role-ui-consistency.md`).
- **There is no `focus-visible` styling** (0 occurrences). Inputs use `outline-none` with a blue ring (`app/dashboard/dashboard-shell.tsx:310`, `app/auth-shell.tsx:81`), so focus is blue in an orange brand.
- **Gold fails contrast.** Gold `#debb30` on white is 1.87:1 and gold text on hover (`#b89620`) is 2.83:1, so every `text-orange-600` label fails. Examples: `app/page.tsx:280`, `:366`, `:482`, `app/site-page.tsx:19`, `:33`. White on gold (`customer-app-view.tsx:757`) is 1.87:1.
- **Pages are client-only with no route states.** There is no `loading.tsx`, `error.tsx` or `not-found.tsx` anywhere in `app/`. 22 files are `"use client"`, including every dashboard and the payment page.
- **Font mismatch to resolve.** `docs/role-ui-consistency.md` says the apps use Space Grotesk, but `ui/sutura-app/src/theme.ts:53-58` and `src/hooks/useAppFonts.web.ts:2-5` load Inter. The web keeps Space Grotesk as briefed. Record a decision either way.

## 1. Findings per area

Format: `file:line` and the finding. Ratings follow unslop: heavy, light or no slop.

### 1.1 Marketing — **heavy slop**

`app/page.tsx`, `landing-header.tsx`, `site-page.tsx`, `faq-section.tsx`, `site-nav.ts`, `company/*`, `help`, `status`, `contact`, `pay/[reference]`, `merchants/register`, `operations/reconciliation/page.tsx`

**Spacing**
- `page.tsx:303,308`: arbitrary radii `rounded-br-[5rem]`, `rounded-br-[8rem]`. `page.tsx:350`: arbitrary widths `w-[13rem]`, `w-[16rem]`, `w-[18rem]`.
- `page.tsx:383`: `lg:min-h-[70vh]` per feature card, plus a sticky left column (`:365`). This makes four tall scroll panes and leaves dead bands between cards.
- `page.tsx:411`: an empty wrapper `<div className="">`. `page.tsx:410`: `rounded-[3rem]` on a wrapper with no surface.
- `landing-header.tsx:142,167`: `px-3.5`, `py-2.5` steps (14px and 10px) are off the 4px rhythm in the main navigation.

**Color**
- `page.tsx:294,376,452`, `landing-header.tsx:101,187`: the primary CTA is gold (`bg-orange-600` = `#debb30`), not Sutura orange.
- `page.tsx:303-304`: radial colour washes (gold, blue, near-black) behind the hero image.
- `page.tsx:334,340-341`: a full gold band with gradient edge fades. `faq-section.tsx:51`: a full gold section.
- `page.tsx:363,397`: one-off tinted backgrounds `#f4f6fb` and `#dfe3f4` (blue-lilac).
- `page.tsx:296`: `text-emerald-600` (3.77:1) used as decoration ("Merchant-ready"), not as a status.
- `landing-header.tsx:128`, `auth-shell.tsx:27`: navy wordmark. The logo wordmark is charcoal.
- `pay/[reference]/page.tsx:50,52,67,69`: the payment page uses a third accent, `blue-800`.

**Icons**
- `page.tsx:289`: a "✓" text glyph in a ring.
- `page.tsx:26-66`: audience icons are mixed sets (24px and 1024px viewBoxes, fill and stroke) at 28px, coloured gold.
- `page.tsx:142-217`: eight store logos at 64px.
- `faq-section.tsx:105`: a "+" glyph that looks like an accordion control but does nothing.

**Copy**
- `page.tsx:280`: "THE GLOBAL NETWORK FOR SERIOUS PAYMENTS" is an unverifiable claim in uppercase tracked text.
- `page.tsx:367`: "What makes Sutura different?" is a template headline.
- `page.tsx:402-406`: an invented testimonial attributed to "Head of Payments, Merchant platform". This breaks the "no invented customers" rule.
- `page.tsx:136-221`: the "Get the Sutura apps" links go to generic store home pages (`play.google.com/store`, `apple.com/app-store`, Huawei, Galaxy, Amazon, Windows), which implies listings that do not exist.
- `page.tsx:224-270`: social links go to `x.com/`, `linkedin.com/` and similar, not to Sutura accounts.
- `page.tsx:413-421`: an external YouTube video with no stated relation to Sutura.
- `page.tsx:445`: "Ready to launch with Sutura?" is a generic CTA.
- `page.tsx:97,102,107,112`: feature titles end with periods.
- `status/page.tsx:10,27`: "All systems operational" is hardcoded static text. A status page must not assert health it does not measure.
- `merchants/register/merchant-registration-page.tsx:12-15`, `help/page.tsx:18-20`: public visitors are told to `cd ui/merchant-app && npm start`. This is developer setup text on a customer page.
- `site-nav.ts:18`: "Admin dashboard" appears in public navigation.

**Type**
- `page.tsx:281`: the h1 uses the global weight 800 and stays at `3rem` on desktop, smaller than section h2s at `md:text-6xl` (`:367`). Hierarchy is inverted.
- `page.tsx:326,336,355,367,370,388,401,405,445`: `font-black` on almost every heading and on the quote.
- `page.tsx:280,296,310,366,400,444,482`, `site-page.tsx:19,33`, `faq-section.tsx:54,95`, `landing-header.tsx:77`: uppercase tracked eyebrows. `site-page.tsx:19` puts the eyebrow "Sutura" on every page.

**Layout**
- `page.tsx:278-315`: the split hero has a stock image (`res.cloudinary.com/.../wp_vznega.jpg`) and a "Customer and merchant experience" chip instead of the product.
- `page.tsx:293-299`: one CTA plus a stacked label block. Log in is a second bordered button in the header (`landing-header.tsx:180-185`).
- `page.tsx:439-519` and `site-page.tsx:29-49`: the `<footer>` is nested inside `<main>`.
- `faq-section.tsx:19-117`: dead component (no imports), with questions that have no answers.

**Details**
- `page.tsx:384`: feature cards are `rounded-[1.75rem]` and `md:rounded-[2rem]`, buttons are pills, and inline content blocks use `rounded-2xl` (`site-page.tsx:57`). There is no radius system.
- `page.tsx:71-134`: `journeySteps`, `proofStats`, `customerHighlights` and `merchantHighlights` are defined and never rendered.

**Visuals**
- `page.tsx:306`, `auth-shell.tsx:47`: unrelated stock photography. The product (wallet, receipt, payment link) is never shown.

**Motion**
- `page.tsx:343` and `globals.css:35-51`: an infinite marquee. It does respect reduced motion (`globals.css:53-56`).
- `page.tsx:350,452`: `hover:-translate-y-1` and `hover:-translate-y-0.5` lifts.
- `landing-header.tsx:158`: `transition-all` on dropdowns. `landing-header.tsx:202-214`: `transition-all` on hamburger bars.

**Accessibility**
- Gold text fails contrast (see section 0).
- `globals.css:17`: links are unstyled (`no-underline`), so inline prose links (`help/page.tsx:26-45`, `merchants/webhooks/page.tsx:31,35`) rely on colour alone.
- `landing-header.tsx:135-139`: desktop menus open on hover. Escape is handled only for the mobile menu (`:37-43`), and focus is not managed.
- `landing-header.tsx:48`: the mobile portal uses `aria-hidden` but not `inert`, so links stay tabbable while it is hidden.
- `pay/[reference]/page.tsx:62`: the select's label wraps the text but has no visible focus style. `:57`: the amount is not tabular.

**Performance (React/Next)**
- `page.tsx:305,420`, `auth-shell.tsx:46`: raw `<img>` for the LCP image with no width, height or priority, which risks layout shift.
- `app/layout.tsx:10-13`: metadata exists only at the root. No marketing page sets its own `title`, `description` or Open Graph data.
- `pay/[reference]/page.tsx:1`: the whole checkout is a client component that fetches after hydration. It could render the link server-side, with a client island for Pay.

**Missing states**
- `pay/[reference]/page.tsx:36`: `payPaymentLink` posts without an `Idempotency-Key` (`lib/wallet-api.ts:134-136`).
- The payment page has no amount or fee summary before "Confirm payment" (`:67`) and no receipt state after PAID beyond a status line (`:59`).
- There are no 404 or error pages.

### 1.2 Auth — **light slop** (designed shell, with brand, copy and accessibility issues)

`auth-shell.tsx`, `auth-content.tsx`, `login`, `signup`, `merchants/pending`

**Spacing**
- `auth-content.tsx:158,191`: `space-y-3.5` (14px).
- `auth-shell.tsx:81`: input radius switches from `rounded-2xl` to `rounded-full` at `sm`.

**Color**
- `auth-shell.tsx:17` and `components/sutura-loader.tsx:11`: a blue-tinted canvas `#eaf0ff`.
- `auth-shell.tsx:27,38`, `auth-content.tsx:250,259`: navy links and wordmark.
- `auth-content.tsx:184,243`: a gold primary button.
- `auth-content.tsx:51` vs `auth-shell.tsx:81`: two focus colours on one form (orange ring and blue ring).

**Icons**
- `auth-content.tsx:172,226,234`: `EyeOffIcon` is decoration only, with no toggle. The mobile decision says login has password visibility.
- `auth-content.tsx:31-48`: Google and Facebook icons are defined and never used. `SocialButton` and `DividerText` are imported but not rendered (`:8`).

**Copy**
- `auth-content.tsx:155`: "Welcome back!" (exclamation, greeting).
- `auth-content.tsx:186`: "Login" used as a verb on the button. Use "Log in".
- `auth-content.tsx:84`: "Web login is for developer and admin accounts…" contradicts the shipped customer web (`app/app`) and merchant dashboard.
- `auth-content.tsx:141`: "← Back to sign in" uses a text arrow.

**Type**
- `auth-shell.tsx:27`: `tracking-[-0.04em]` at 20px on mobile.
- `auth-content.tsx:145`: `tracking-[0.5em]` on the OTP input.

**Layout**
- `auth-content.tsx:139-142`: the verify screen renders two `<h1>`s, the shell heading and "Enter verification code".

**Details**
- `merchants/pending/page.tsx:9-20`: the file is minified onto single lines, so it cannot be reviewed. `:18`: the button is `bg-amber-400`, a fourth accent.

**Accessibility**
- `auth-shell.tsx:74-82`: `AuthField` has no label, only a placeholder. There is no `autoComplete` on email or password (`auth-content.tsx:160-175`, `213-236`).
- `auth-content.tsx:177,238`: errors are not `role="alert"`, although the OTP path is (`:149`).
- `auth-content.tsx:197-198`: first and last name inputs have placeholder only.
- `auth-shell.tsx:49`: the image alt "Sutura visual" is meaningless. Use empty alt.

**Performance**
- `login/page.tsx` and `signup/page.tsx` render one client component that holds both modes. This is fine. A cold free-host backend start shows only "Signing in…" (`:186`) with no timeout copy.

**Missing states**
- No session-expired message on return to `/login`.
- No offline or timeout state.
- No account-locked state beyond static help text (`auth-content.tsx:179`).

### 1.3 Customer web (`app/app/customer-app-view.tsx`, `app/app/verification/page.tsx`) — **heavy slop**

**Spacing**
- `:107,136,148,193`: radii `1.25rem` and `1.75rem`.
- `:148`: the wallet card overlaps the top-up strip with `-mt-6`.
- `:193`: `py-3.5`.

**Color**
- `:148`: a navy gradient wallet card (`from-[#123c91] via-[#1649a8] to-[#1e5bb8]`).
- `:193,201`: "Send" is navy and "Top up" is gold `orange-400`, so two primaries compete side by side.
- `:603`: canvas `#eaf0ff`.
- `:84-87`: four hue tiles per transaction type.
- `:757`: white text on gold, 1.87:1.
- `:870`: wallet status is always emerald, whatever the value.

**Icons**
- `:90-93`: transaction icons are text glyphs (↓ ↑ + −).
- `:212-215`: "More actions" is four dots that just open Activity.
- `:878,886,894`: "→" text arrows.

**Copy**
- `:623`: a greeting headline via `getGreeting()` (`lib/mock/customer-dashboard.ts:125-130`).
- `:685,723,783`: "Amount (GMD)" is hardcoded whatever the wallet currency.
- `:379`: "Sent … successfully".
- `:709`: "Send now".

**Type**
- `:117,164,168,253,634`: `text-[10px]` meta and nav labels.
- `:164,168,265`: uppercase tracked labels.
- `:158`: the balance has `tracking-tight` but no tabular figures.

**Layout**
- `:604`: a `max-w-lg` phone column on desktop, which is acceptable for a wallet but has no desktop variant.
- `:239`: the bottom navigation is fixed and has no Top up or Withdraw entries. Withdraw is reachable only from Home and Profile.

**Details**
- `:629-638`: the bell button has no `onClick` and does nothing.

**Visuals**
- `:150-154`: the logo sits inside the card on a `white/10` tile.

**Motion**
- `:141`: `hover:scale-105` on the top-up button.

**Accessibility**
- `:244-251`: bottom navigation buttons have no `aria-current`.
- `:605-613`: the message banner has no live region.
- `:676-704`: placeholder-led inputs with an uppercase label.
- `verification/page.tsx:74`: "← Back" text arrow.

**Performance**
- 911 lines in one client component. A dozen `useState` hooks re-render the whole view on every keystroke (`:280-291`).
- `app/dashboard/dashboard-view.tsx:3-7` statically imports all four role views, so a customer downloads the admin, merchant and developer code too.

**Missing states**
- `:281-283,337-339`: a live session starts from `emptyCustomerDashboard` (balance 0, status ACTIVE, `lib/mock/customer-dashboard.ts:29-41`). When refresh fails, the error is swallowed and the page shows "GMD 0.00" as if it were the real balance. This breaks "never show sample balances".
- `:316`: `dailyLimit: 50000` is invented for live data.
- `:657-661,836-840`: no empty state for zero transactions, and no per-row status (pending or under review), even though status is loaded (`:331`).
- `:705,755,812`: submit buttons have no busy or disabled state, so repeat submission is possible.
- `:373,427,526`: idempotency keys are minted per click (`Date.now()`), so a manual retry after a timeout is a new write.
- There is no confirm step showing recipient, fee and amount received before "Send now".
- There is no receipt view.

### 1.4 Merchant dashboard (`app/dashboard/merchant-dashboard-view.tsx` and shared shell) — **heavy slop**

**Spacing**
- `dashboard-shell.tsx:272`: panels at `rounded-[1.5rem]` and `sm:rounded-[2rem]`.
- `:481`: three `DataTable`s squeezed into `lg:grid-cols-3`.
- `:509`: two components on one source line (formatting).

**Color**
- `dashboard-charts.tsx:227` and `dashboard-shell.tsx:264`: navy gradient hero card.
- `:280,353,371,554`: navy links and amounts.
- `dashboard-charts.tsx:7`: a rainbow `CHART_COLORS` that includes purple `#8b5cf6`.
- `dashboard-shell.tsx:310,313`: grey-filled inputs (`bg-slate-200`) with blue focus rings.
- `dashboard-shell.tsx:316-317`: a heavy `slate-200` table head and zebra rows.
- `dashboard-toolbar.tsx:202`: "Download CSV" uses the accent, which spends it on a secondary action.

**Icons**
- `dashboard-tabs.tsx`: merchant tabs mix line SVGs. Admin tabs use letter glyphs (see 1.6).
- `dashboard-toolbar.tsx:163,197,203`: SVGs without `aria-hidden`.

**Copy**
- `:264`: "Dashboard refreshed from API" after every write.
- `:60,197`: "…successfully" toasts.
- `:391-396`: a "Wallet tools" panel lists features as bullets with no actions.
- `:243`: Subscriptions errors in live mode ("not available via API yet") but is still a tab.
- `:310`: "Settlement progress" with an invented value.

**Type**
- `:22`, `dashboard-toolbar.tsx:97`: uppercase field and KPI labels.
- `dashboard-charts.tsx:231`: `text-4xl font-black tracking-tight` hero figure.
- Amounts are strings with no tabular figures (`:373,491,519,538`).

**Layout**
- `:301-335`: a hero card, a line chart, three KPI cards (one with a sparkline) and a donut, all competing. "Did I get paid" is not answered first.
- `:313`: chart subtitle "GMD thousands · 7d".

**Details**
- `dashboard-charts.tsx:191-207,:327`: a sparkline in one KPI card only.
- `:326`: `changePositive={i === 0}` colours hints arbitrarily.
- `:492,506`: every deposit and withdrawal status is amber. `:520,539`: raw status strings. Four different status renderings exist in one file.
- `:518`: "from→to" with no spaces.

**Visuals**
- `dashboard-charts.tsx:234`: the logo inside the hero card.

**Motion**
- `dashboard-charts.tsx:241`: `transition-all` on the progress bar.

**Accessibility**
- `dashboard-shell.tsx:151-158`: tabs have no `aria-current` or `aria-selected`, and the `aria-label` duplicates the visible text.
- `dashboard-shell.tsx:231-238`: the message banner has no `role`.
- `data-table.tsx:90`: `th` has no `scope` and no caption.
- `dashboard-toolbar.tsx:167-186`: search and date range have no labels.
- `dashboard-charts.tsx:56,106,163`: charts have no `role="img"` or summary. Their fixed 560-wide viewBox scales 11px labels below 11px on phones.

**Performance**
- `:28-276`: 13 `useState` hooks in a single 617-line client component.
- `data-table.tsx:103`: `key={i}`.
- Tabs are `useState` (`:30`), so refresh and back lose the view.

**Missing states**
- `:29`: initial state is `mockMerchantDashboard`, so a live merchant sees mock collections, a chart and payments until or unless the API answers. On failure the mock stays (`:265-267`).
- `:309`: `progress={88}` is hardcoded.
- `:298`, `data-table.tsx:82`: Refresh does not refetch in demo, and in tables it only bumps a key.
- `data-table.tsx:95-99`: "No results match your search" is shown even when there are no records at all.
- `:57,79,135,190,217`: money writes have no busy state and no idempotency key (`lib/wallet-api.ts:100` sends one only if `reference` is passed).
- There is no transfer confirmation with fee.
- `:341,564`: payment link amount has no `inputMode` or validation.
- `:51`: errors auto-dismiss after 4 seconds.

### 1.5 Developer dashboard (`app/dashboard/developer-dashboard-view.tsx`) — **light slop**

**Spacing**
- `:139-147`: stat tiles use `p-5`, while `KpiCard` elsewhere uses `p-4` (`dashboard-toolbar.tsx:227`).

**Color**
- `:150,212,218,250`: emerald-on-black "terminal" code blocks (`text-emerald-100` on `slate-950`).
- `:192`: Revoke is an amber chip.
- `:130`: a gold primary.

**Icons**
- Same shell issues as the merchant dashboard.

**Copy**
- `:95`: "API key created — copy it now, you won't see it again" is a toast that disappears after 4 seconds (`:74`).
- `:248-253`: the "Webhooks" tab is titled "Integration status" and says outbound delivery "is not available". Rename the tab or remove it.
- `:252`: operator-facing wording ("Provider and Sentinel settlement callbacks…").

**Type**
- `:19,142`: uppercase labels.
- `:143`: `font-black` figures.

**Layout**
- `:124-151`: a three-step explainer sits above the stats, which is good for onboarding. Steps are numbered because they are a real sequence (`:36`). Keep it.

**Details**
- `:63,90`: the "created" column is filled from `expiresAt`, which is mislabelled data.
- `:62,89`: the prefix shows `publicId_••••`. There is no environment label (test or live) anywhere, which `surfaces.md` requires.

**Accessibility**
- `:212`: the new secret has no Copy button and no confirmation that it was copied.
- `:192`: revoke has no confirmation.

**Performance**
- `:46,69,103`: very long single-line expressions, including the inline demo data object, which are hard to review.

**Missing states**
- `:46`: an authenticated session starts from `mockDeveloperDashboard`, with mock stats and payments visible until both requests finish. A failed request (`:68-69`) leaves the mock data on screen.
- `:239-241`: any status other than paid or pending becomes rose (danger), including REVIEW.
- `:210-215`: the secret panel never clears and has no "I've stored it" dismissal.

### 1.6 Admin and reconciliation (`app/operations/admin/*`, `app/dashboard/[...screen]/page.tsx`, `app/operations/reconciliation/page.tsx`) — **heavy slop**

**Spacing**
- `:554`: `mb-2` inside `space-y-3` on audit rows, which doubles spacing.
- `:659-670`: reconciliation tiles at `rounded-[1.5rem]`.

**Color**
- `:538`: hover to `bg-blue-200`.
- `:665`: a navy figure.
- `:847,882,966,998`: navy filled Resolve and Reverse buttons and blue Unfreeze. Destructive Reverse is styled as a primary.
- `:578,605`: Freeze and Reverse submit with the orange `PrimaryButton`.
- `:504`: a red sparkline.

**Icons**
- `dashboard-tabs.tsx:20-26,34`: navigation "icons" are letters and glyphs: `C`, `M`, `A`, `ID`, `↓`, `↑`, `QR`, `?`. They are mixed with line SVGs (`:28-33`).

**Copy**
- `:534`: "All clear — no urgent items."
- `:557`: raw enum action names (`FREEZE_WALLET`).
- `:669`: "Status: Live" is hardcoded. `:931`: a "Live" chip is hardcoded on the reports table.
- `:486`: "Dashboard refreshed" with no refetch.
- `:497-498`: "Operational capacity" at an invented 94%.

**Type**
- `:1019`: status pills are UPPERCASE raw enums.
- `:660,664,668`: uppercase tile labels.
- `:748-786`: `font-black` on definition values.
- `:560`: `text-[10px]` timestamps.

**Layout**
- `:489-526`: the overview has a hero card, four KPIs, two equal donuts (`:511,514`) and two equal half-width charts (`:519-525`). Nothing leads, and the actionable queue ("Requires attention", `:531`) sits below the fold.
- `dashboard-shell.tsx:229`: the admin sidebar is good (routes, 224px) but has an uppercase label.
- `:817-823`: `OpsLayout` renders action forms in a `max-w-3xl` column that replaces the table.

**Details**
- `:1010-1020`: `StatusPill` gives REVERSED the same red as FAILED and SUSPENDED the same amber as PENDING. It uses colour only (no dot or shape), and other statuses fall to grey.
- `:1022-1026`: risk levels use a separate scale.
- `:117-118`: live wallets have `kycLevel` hardcoded to "BASIC" and `dailyLimit` to 0, so the table shows invented KYC (`:836`).

**Visuals**
- Charts are mock-driven (`:521` "GMD thousands").

**Motion**
- None beyond the shell.

**Accessibility**
- `:576,599,638`: sensitive actions are typed-ID forms with no confirmation dialog, no impact preview and no busy state. Freeze, reverse and reprocess can be double-submitted. A reason is required (good, `:577,600`).
- `support-desk.tsx:42`: two full-width buttons in one flex row.
- `operations-workspace.tsx:24-38`, `merchants/pending/page.tsx`: minified single-line JSX that cannot be reviewed or audited.

**Performance**
- `admin-dashboard-view.tsx` is 1,026 lines with 23 `useState` hooks in one component, so every form keystroke re-renders the whole admin view, including charts and tables.
- `dashboard/[...screen]/page.tsx:12` renders the whole view for every sub-route.
- `operations-workspace.tsx:28`: a 30-second poll with no "updated Xs ago" indicator.

**Missing states**
- `:53`: a live session starts from `initialAdminDashboard`.
- `:152-154`: risk panel errors are swallowed ("keep mock panels").
- `:674-675`: mismatches have no detail view. Variance is a red string (`:956`) and there is no balanced debit/credit posting view. `surfaces.md` requires ledger postings shown as balanced debit and credit.
- `:680,684`: Run reconciliation has no running state.
- `operations/reconciliation/page.tsx` is a marketing explainer, not a tool, but `site-nav.ts:19` lists it under Operations.

## 2. Direction (unslop, five lines, existing brand)

- **Product.** Sutura moves money between wallets, merchants and cash agents in The Gambia on a double-entry ledger, and gives developers and Sutura staff the tools to integrate, review and reconcile every posting.
- **Character.** Exact, warm, unhurried.
- **World.** The agent's counter and the ledger book: stamped receipts, references written in the margin, dalasi changing hands. White and charcoal paper surfaces carry one warm orange taken from the logo.
- **Moments.**
  - The money figure: a balance or amount set large in tabular Space Grotesk with its currency, on a flat charcoal wallet card (no gradient).
  - The receipt and posting: a balanced debit/credit pair with its reference. It is the payment-link checkout result, the transaction drawer, the reconciliation mismatch detail and the marketing hero's product preview.
- **Signature.** The reference stamp, used the same way everywhere: `● Posted · TXN-2026-004182`. It has a status dot and label, the reference in mono, and click to copy. It appears on customer receipts, merchant tables, developer payments and admin ledger rows.

Accent use: Sutura orange marks the primary action, the selected navigation item and the focus ring. It never fills chrome, decorative bands or secondary buttons such as Download CSV. Navy, gold, teal and the blue tints are removed.

## 3. Token set

The tokens align with `ui/sutura-app/src/theme.ts` (identical in `sutura-agent` and `merchant-app`). Implement them as CSS variables with `:root[data-theme=light|dark|auto]`, following zender's `foundation.css:8-120` structure, and map them in `tailwind.config.ts`. Ratios in brackets are measured.

### 3.1 Neutral ramp

| Role | Light | Dark | Mobile source |
| --- | --- | --- | --- |
| `--canvas` (page) | `#ffffff` | `#000000` | `background` |
| `--surface` (card, panel) | `#ffffff` with border | `#1c1c1e` | `surface` |
| `--surface-2` (grouped, raised row, input) | `#f5f5f7` | `#2c2c2e` | `surfaceMuted` |
| `--surface-3` (selected row, hover) | `#ececf0` | `#3a3a3c` | new |
| `--line` (hairline) | `#e5e5ea` | `#38383a` | `border` |
| `--line-strong` (input border) | `#c7c7cc` | `#48484a` | new |
| `--text` | `#1c1c1e` [17.0:1] | `#f2f2f7` [18.8:1 on black] | `primary` |
| `--text-2` | `#636366` [6.0:1 on white, 5.5:1 on `surface-2`] | `#aeaeb2` [7.7:1 on `#1c1c1e`] | replaces `slate500` |
| `--text-3` (meta, captions only) | `#6e6e73` [5.1:1 on white] | `#8e8e93` [5.2:1 on `#1c1c1e`; use `--text-2` on `#2c2c2e`, where it is 4.3:1] | new |
| `--charcoal-card` (wallet card moment) | `#1c1c1e` | `#2c2c2e` | `primary` / `surfaceMuted` |

### 3.2 Accent (Sutura orange)

| Token | Light | Dark |
| --- | --- | --- |
| `--accent` (fill: primary button, selected navigation) | `#f97316` | `#f97316` |
| `--accent-hover` | `#ea580c` | `#fb923c` |
| `--on-accent` (text on fill) | `#1c1c1e` [6.1:1; 4.8:1 on hover] | `#1c1c1e` |
| `--accent-ink` (accent as text or link, focus ring) | `#c2410c` [5.2:1 on white, 4.7:1 on tint] | `#fb923c` [7.5:1 on `#1c1c1e`] |
| `--accent-tint` (selected row, chip) | `#fff1e6` | `#3c2c20` (mobile `orangeLight` dark) |
| `--focus` | `2px solid var(--accent-ink)`, offset 2px | same |

White on `#f97316` is only 2.8:1, so text on orange is charcoal. If the mobile apps put white text on orange, they fail the same check. Note this for the mobile team.

### 3.3 Semantic status tones

Every badge shows a dot or shape plus a human label, never colour alone. This is one map across all apps. Reversed is deliberately not the same as failed; zender maps REVERSED to danger, and Sutura should not.

| Status | Covers | Shape | Light fg / bg | Dark fg / bg |
| --- | --- | --- | --- | --- |
| Pending | PENDING, AWAITING_AGENT, RUNNING, PENDING_REPROCESS | hollow ring | `#9a5b00` / `#fef3e2` [4.9] | `#f5b54a` / `#3a2a0e` [7.6] |
| Under review | REVIEW, PENDING_REVIEW, MORE_INFO_REQUIRED, KYC pending (Sentinel) | half-filled dot | `#1d4ed8` / `#eaf0fd` [5.9] | `#8fb4ff` / `#16244a` [7.3] |
| Posted | COMPLETED, PAID, POSTED, ACTIVE, PROCESSED, VERIFIED | filled dot | `#166534` / `#e8f6ee` [6.4] | `#5fd39a` / `#10301f` [7.7] |
| Reversed | REVERSED, REFUNDED | return arrow or square | `#4b4b52` / `#f0f0f2` [7.6] | `#c7c7cc` / `#2c2c2e` [8.3] |
| Failed | FAILED, DECLINED, REJECTED | cross | `#b42318` / `#fdecec` [5.8] | `#ff8a80` / `#3d1616` [6.9] |
| Suspended, frozen | SUSPENDED, FROZEN | lock | uses Failed fg on `--surface-2` | same |
| Expired, muted | EXPIRED, REVOKED, CLOSED | dash | `--text-3` / `--surface-2` | same |

Earlier drafts used `#15803d` for posted, which is only 4.5:1 on its tint. Use `#166534`.

### 3.4 Type

- **Family.** Space Grotesk (brand), already loaded in `app/layout.tsx:4-7`, weights 400, 500 and 600. Numbers use `font-variant-numeric: tabular-nums`; confirm `tnum` support at build, otherwise set amounts in the mono stack.
- **Mono** for references, IDs, keys and code: `ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`. This needs no extra download (zender: "no web-font download").
- **App scale** (dashboards, compact like zender's desk tools):

| Use | Size / line height | Weight |
| --- | --- | --- |
| Meta | 12 / 16 | 400 |
| Body | 14 / 20 (tables 13 / 18) | 400 |
| Label | 14 / 20 | 500 |
| Section title | 16 / 24 | 600 |
| Page title | 20 / 28 desktop, 24 / 32 mobile | 600 |
| KPI figure | 28 / 32, tabular | 500 |
| Wallet balance moment | 40 / 44, tabular, −0.02em | 500 |

- **Marketing scale:** hero 56 / 60 desktop and 36 / 40 mobile at weight 500 with −0.03em tracking; h2 32 / 40; subhead 18 / 28 in `--text-2`, max 36rem wide.
- **Rules:** letter-spacing 0 under 16px. No uppercase labels. No weights 800 or 900.

### 3.5 Radii, spacing, depth

- **Radii:** status chip 999 (pill only for status); control (button, input, select) 8, matching mobile `sm: 8` and the "8px primary button corners" decision; row and list item 10; card 14 (mobile `md: 14`); panel, drawer and sheet 20 (mobile `lg: 20`). Nested: inner = outer − padding, minimum 4.
- **Spacing:** 4px grid. Page gutter 16 on mobile, 24 on tablet, 32 on desktop. Card padding 20. Dense table row 40 (zender 36–40). Control height 40 on desktop and 44 on touch. Customer-web primary button 52, matching the mobile 52pt decision. Admin sidebar 224–248 wide.
- **Depth:** light theme `0 1px 2px rgb(0 0 0 / .05)` on cards and `0 8px 24px rgb(0 0 0 / .08)` on drawers and popovers. Dark theme uses surface steps plus hairlines only. No coloured shadows; mobile `shadow.fab` uses an orange shadow and should change too.

### 3.6 Motion

- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` everywhere.
- **Durations:** 150ms for hover, press and toggles; 200ms for menus and popovers; 320ms for drawers and sheets. Press scale 0.98. Entrance rise 8px, at most once per page.
- **Transitions:** colour, background, border, opacity and transform only. No `transition-all` and no `hover:scale` or translate on cards.
- **Reduced motion:** sets all durations to 0. No loops, except a live indicator dot that is truly live and a spinner inside a button.

## 4. Zender patterns to adopt

Take the pattern, not zender's navy and amber. Colours come from section 3.

| Pattern | Zender source | Sutura web files to change | Adaptation |
| --- | --- | --- | --- |
| Route per view instead of `useState` tabs | `packages/ui/src/use-view-param.ts`; research doc: "App Router routes per view" | `dashboard/merchant-dashboard-view.tsx:30`, `dashboard/developer-dashboard-view.tsx:47`, `app/customer-app-view.tsx:284`, `dashboard/dashboard-shell.tsx:17-28` (`onTabChange`) | Admin already routes (`admin-dashboard-view.tsx:58-59`, `dashboard/[...screen]/page.tsx`). Give merchant, developer and customer the same. Split by role with `next/dynamic` in `dashboard/dashboard-view.tsx:3-7`. |
| Semantic status tone map, with dot and human label | `components.tsx:18-170` (`statusTone`, `statusLabel`, `<Status>`), `foundation.css:454-500` | Replace `admin-dashboard-view.tsx:1010-1026`, `developer-dashboard-view.tsx:239-241`, `merchant-dashboard-view.tsx:375,492,506,520,539,558,585,610`, `customer-app-view.tsx:102-121`, `app/verification/page.tsx:78`, `agent-qr-preview.tsx:40` | Use Sutura's five tones from 3.3. Reversed stays distinct from failed. Add KYC labels. |
| Shared dense `DataTable` | `components.tsx:478-617` (align, `sortValue`, `rowKey`, `onRowClick`, `caption`, `loading`, `empty`, `hideOnMobile`, `td.num`) | `dashboard/data-table.tsx` (keep search, CSV and pagination; add those props), `dashboard/dashboard-shell.tsx:315-317` | Right-aligned tabular money through a `Money` helper (`components.tsx:651-671`), hairline rows instead of zebra, a selected row in `--accent-tint`, and a row that opens a drawer. |
| Skeletons and distinct empty states | `components.tsx:235-308` (`Skeleton`, `SkeletonRows` with `role="status"`, `Empty`) | `components/sutura-loader.tsx:38-73` (remove the spinner over the skeleton at `:62-71`), `data-table.tsx:95-99`, `customer-app-view.tsx:657,836`, `support-desk.tsx:44` | "No payments yet" with an action is a different state from "No results — clear search". |
| Live data, never mock | `use-api-resource.ts` (loading, error and refreshing, keyed by path) | `merchant-dashboard-view.tsx:29,259-268`, `developer-dashboard-view.tsx:46,54-70`, `customer-app-view.tsx:281-283,295-340`, `admin-dashboard-view.tsx:53,85-155` | Show a skeleton while loading, an error with Retry on failure, and data only when live. Demo data only behind an explicit demo session, labelled "Demo". |
| Drawers instead of inline or replacing forms | `components.tsx:310-391` (`Drawer`: side on desktop, bottom sheet on phones; `Modal`) | `admin-dashboard-view.tsx:571-607,636-649,697-719` (`OpsLayout` at `:817`), `merchant-dashboard-view.tsx:338-344,379-389,561-566`, `developer-dashboard-view.tsx:201-215` | Row action opens a drawer with record context, impact preview, reason and a confirm button in danger tone for freeze, reverse and revoke. Money writes get a review step: amount, fee and recipient. |
| Toasts for success, inline error with Retry | `components.tsx:175-233` (`ToastProvider`; errors stay 8s; dismissible; `role` by tone), `portal.tsx:20-53` (`Notice`) | `dashboard/dashboard-shell.tsx:231-238`, `notify()` in `merchant-dashboard-view.tsx:49-52`, `developer-dashboard-view.tsx:72-75`, `customer-app-view.tsx:353-356,605-613`, `admin-dashboard-view.tsx:163-166` | Money failures stay inline next to the button with "Check Activity before retrying". The API key secret is never shown in a toast. |
| Functional page titles | `portal.tsx:55-76` (`PageHeading`: title, one-line description, action); research: "Functional titles" | Every tab body. The shell currently has no page h1. Also `customer-app-view.tsx:617-639` (greeting), `auth-content.tsx:155` | Use "Payments", "Wallets", "Reconciliation", "Today". The primary action sits in the heading's action slot. Drop the eyebrow. |
| One line icon set | `icons.tsx:1-123` (24px paths, stroke, `aria-hidden` by default, label to make it an image) | `dashboard/dashboard-tabs.tsx:5-34`, `customer-app-view.tsx:23-99`, `page.tsx:23-68`, `dashboard-toolbar.tsx:163,197,203` | Use 16 and 20px, stroke 1.75, in the text colour. Navigation `NavItem` with icon, badge and group (`portal.tsx:78-88`), giving admin groups such as Operate, Money, Risk and Admin. |
| Dark tokens and theme switch | `foundation.css:68-120` (`data-theme` light, dark and auto, with paired fg/bg tones) | `globals.css`, `tailwind.config.ts`, `layout.tsx:15-20` (`themeColor` per scheme), a theme control in the dashboard shell user menu | Uses the Sutura ramp from 3.1. Persist the choice the way the mobile apps do. |
| Live indicator only when actually live | `components.tsx:673-739` (`RelativeTime`, `LiveIndicator`) | `operations-workspace.tsx:28` (30s poll): show "Updated 12s ago". Remove the fake "Live" at `admin-dashboard-view.tsx:669,931` and the Live/Demo pill guess at `dashboard-shell.tsx:173-179` | Honest freshness instead of hardcoded "Live". |
| KPI tiles that link to filtered lists | `components.tsx:432-476` (`Kpi` with `onClick`); research: "Overview as an exception board" | `admin-dashboard-view.tsx:501-506`, `merchant-dashboard-view.tsx:319-330`, `dashboard-toolbar.tsx:213-238` | No sparklines and no invented progress. Each tile opens its filtered table. |

## 5. Top 10 changes, in priority order

| # | Change | Files | Size |
| --- | --- | --- | --- |
| 1 | **Honest data.** Remove mock and empty-as-real initial state in live sessions. Add loading skeletons, error with Retry, and "nothing yet" vs "no results". Never show sample balances (`useApiResource` and `SkeletonRows` patterns). | `merchant-dashboard-view.tsx:29,265-267,309`; `developer-dashboard-view.tsx:46,68-69`; `customer-app-view.tsx:281-283,316,337-339`; `admin-dashboard-view.tsx:53,117-118,152-154,497,669,931`; `data-table.tsx:95-99`; `components/sutura-loader.tsx` | M |
| 2 | **Brand tokens and dark theme.** Restore Sutura orange. Remove the gold remap, teal, Roboto and navy `#123c91`. Add CSS variables for the 3.1–3.6 tokens with `data-theme` light, dark and auto. Add a `focus-visible` ring. Delete legacy CSS. Codemod the 89 navy usages to `--accent-ink` or `--text`. | `tailwind.config.ts`; `app/globals.css`; `app/layout.tsx:19`; all `#123c91` and `orange-*` users | L |
| 3 | **Safe money writes.** Busy state inside the button, an idempotency key kept per attempt (not per click), a review step with amount, fee and recipient, a receipt with the reference stamp, and "Check Activity before retrying". | `customer-app-view.tsx:358-583,705,755,812`; `merchant-dashboard-view.tsx:54-238`; `pay/[reference]/page.tsx:33-38,67`; `lib/wallet-api.ts:134-136` | M |
| 4 | **One status system.** A `StatusBadge` with Sutura's five tones (dot or shape plus label) plus KYC labels, replacing all ad-hoc renderings. | `admin-dashboard-view.tsx:1010-1026`; `developer-dashboard-view.tsx:165,183,239-241`; `merchant-dashboard-view.tsx:375,492,506,520,539,558,585,610`; `customer-app-view.tsx:102-121`; `app/verification/page.tsx:78`; `agent-qr-preview.tsx:40` | S |
| 5 | **Shared DataTable upgrade.** Column `align` and `num`, tabular `Money`, `rowKey`, sort, caption and `scope`, labelled search and date filters, a real refetching Refresh, row click to detail, hairline rows. | `dashboard/data-table.tsx`; `dashboard/dashboard-toolbar.tsx`; `dashboard/dashboard-shell.tsx:315-317`; `dashboard/dashboard-utils.ts` | M |
| 6 | **Routes per view and role code-splitting.** Merchant, developer and customer tabs become URL routes, with `aria-current` on navigation. `dashboard-view.tsx` loads role views with `next/dynamic`. Split admin into per-section components so a keystroke does not re-render the whole view. | `dashboard/dashboard-view.tsx:3-7`; `merchant-dashboard-view.tsx:30`; `developer-dashboard-view.tsx:47`; `customer-app-view.tsx:284`; `admin-dashboard-view.tsx` (1,026 lines, 23 `useState`); `dashboard-shell.tsx:151-158` | L |
| 7 | **Drawers and confirmation for sensitive actions.** Row actions open a drawer with record context, reason, impact preview and a danger-tone confirm. Add a transaction drawer with balanced debit/credit postings and a mismatch detail. Developer: copy button, environment label and a confirmed dismissal for the one-time secret; confirm before revoke. | `admin-dashboard-view.tsx:571-719,817-1008`; `developer-dashboard-view.tsx:63,90,192,210-215`; `merchant-dashboard-view.tsx:338-344,561-595` | L |
| 8 | **Overviews rebuilt.** Remove the gradient `DashboardHeroCard`, invented progress, sparklines and rainbow chart colours. Use functional `PageHeading`s. The merchant view answers "did I get paid" first; the admin view leads with the attention queue. Use one main chart plus linked KPI tiles. Customer wallet card becomes flat charcoal with one orange primary. Replace glyph navigation icons with one line set. | `dashboard/dashboard-charts.tsx:7,191-246`; `merchant-dashboard-view.tsx:287-359`; `admin-dashboard-view.tsx:470-566`; `customer-app-view.tsx:82-260,615-664`; `dashboard/dashboard-tabs.tsx:5-34` | M |
| 9 | **Feedback model.** A `ToastProvider` for success, inline `role="alert"` errors next to the action, errors not auto-dismissed, live regions for status. Replaces the banner in the shell and the four `notify` copies. | `dashboard/dashboard-shell.tsx:231-238`; `merchant-dashboard-view.tsx:49-52`; `developer-dashboard-view.tsx:72-75`; `customer-app-view.tsx:353-356,605-613`; `admin-dashboard-view.tsx:163-166`; `auth-content.tsx:177,238` | S |
| 10 | **Marketing and auth unslop.** A plain hero headline over a real product preview (wallet and receipt) replacing stock photos and radial washes. Remove the invented testimonial, the fake app-store marquee, generic social links and uppercase eyebrows. Make the status page truthful. Add per-page metadata. Delete dead code (`faq-section.tsx`, `page.tsx:71-134`, `components/dashboard-shell.tsx`). Auth: labelled fields with `autoComplete`, a working password toggle, "Log in" without the exclamation, one h1 on the OTP screen, un-minify `merchants/pending`. | `app/page.tsx`; `landing-header.tsx`; `site-page.tsx`; `status/page.tsx`; `merchants/register/merchant-registration-page.tsx`; `help/page.tsx`; `auth-shell.tsx`; `auth-content.tsx`; `merchants/pending/page.tsx` | M |

Claims to confirm with the owner before keeping any version of them: "The global network for serious payments" (`page.tsx:280`), the testimonial (`:402-406`), app-store availability (`:136-221`), the social accounts (`:224-270`), the YouTube video (`:414`) and "All systems operational" (`status/page.tsx:10`).

Verification after implementation: `npm run build` in `ui/web`, then render at 320, 390, 768 and 1440 in light and dark, keyboard paths, form errors, API down or cold start, and the mobile token parity check.

---

unslop passes and tokens adapted from unslop by Damir Sokolovsky (@heydamir), CC BY 4.0.
