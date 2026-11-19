# Mobile redesign audit — November 2026

Read-only audit of the three Expo apps: `ui/sutura-app` (customer, the reference), `ui/sutura-agent` (agent) and `ui/merchant-app` (merchant). Scope: `src/`, `App.tsx`, theme files. No source was changed. Line numbers refer to the files as of 19 November 2026.

Method: `sutura-ui-build` skill and surfaces; the recorded decisions in `docs/mobile-design.md`, `native-mobile-ui.md`, `role-ui-consistency.md`, `more-settings-design.md`; the unslop pass order and signs list (unslop by Damir Sokolovsky, [@heydamir](https://x.com/heydamir), CC BY 4.0); `apple-design`, `animate-expo`, `better-accessibility` and `better-writing`. Per the coordinator's instruction, the zender project (`C:\Users\Mamadou\Downloads\zender`) is the pattern source and quality bar. Its patterns are adopted, but its navy/amber palette is not: Sutura keeps its orange accent, neutral surfaces and logo.

Contrast figures were calculated from the theme hex values with the WCAG relative-luminance formula. Nothing was rendered on a device, so Dynamic Type, motion and native materials were reviewed from code only.

Rating summary: **customer: light slop** (decorative orange material and card art, uppercase tracked labels, orange spread over the chrome); **agent: light slop** (the cleanest visually, but money-flow and state gaps); **merchant: light slop, the closest to heavy** (raw enum statuses everywhere, three stacked orange buttons, a glyph checkbox, all-inline styles). No app uses emoji as an icon or puts exclamation marks or greeting headlines in shipped UI.

---

## 1. Findings per app

### 1.1 Customer — `ui/sutura-app` (light slop)

**Spacing**
- `src/theme.ts:48-51` `spacing.screen` is 20, but `native-mobile-ui.md` (Compact spacing) records 16-pt gutters. The doc and the code disagree.
- `src/screens/WithdrawScreen.tsx:87` uses `marginTop: -8` to pull the subtitle up, a one-off nudge.
- `src/screens/HomeScreen.tsx:45,50` uses off-grid values: padding 18/12, gaps 7, 5 and 14.
- `src/components/WalletCarousel.tsx:192,205` has inverted radius nesting: the outer card is 20 (`radii.lg`) and the inner card is 24 (`radii.xl`).
- `src/screens/TopUpScreen.tsx:60` puts BackHeader outside the ScrollView, while `WithdrawScreen.tsx:59` puts it inside. Sibling flows sit at different offsets.
- Button radii disagree: `NativeControls.tsx:55` uses 14, `VerificationScreen.tsx:124` uses 12, and `ui.tsx:108` defines an unused 8 (`radii.sm`).

**Color**
- `src/components/GlassBackdrop.tsx:37-38` draws an orange blob (opacity .14 light / .22 dark) behind the blur. This is a radial colour wash on the nav and sheets, and the same file ships in all three apps.
- `src/components/WalletCardArt.tsx:17-29` has an `orangeGlow` gradient circle. Lines 31-65 add swooshes, ellipses and dots: decorative filler on the list card.
- `src/components/WalletCarousel.tsx:16-35,171` sets per-kind gradients (savings `#1a2332` is off-palette) behind `LinearGradient` art panels.
- `src/screens/HomeScreen.tsx:26,47` shows two full-orange action tiles, plus an orange accent bar at `:46` and an orange empty-state icon at `:35`. Orange has become chrome rather than one action.
- `src/screens/ActivityScreen.tsx:60` (accent bar) and `:51` (empty icon) add more orange decoration.
- `src/theme.ts:14-19` mixes a blue-tinted slate ramp with iOS greys (`primary #1c1c1e`), so there are two neutral ramps. `:25` names `blue100` but its value is orange `#ffedd5`.
- `src/theme.ts:68-74` defines `shadow.fab`, an orange coloured shadow token. It is unused but available.
- Text contrast failures:
  - Orange `#f97316` on white measures 2.8:1. It is used for the active tab label at 12 pt (`BottomNav.tsx:43-45`), the wallet kind label at 10 pt (`WalletCarousel.tsx:230`) and the sheet balance (`WalletActionsSheet.tsx:105`).
  - `orangeDark #ea580c` on white measures 3.56:1. It is used for the "Forgot password?" link (`LoginScreen.tsx:119`), the link style (`:126`), `VerificationCodeScreen.tsx:34` and the pending status at 11 pt (`TransactionRow.tsx:45`).
  - Pending orange on `orangeLight` measures 2.45:1 (`TransactionDetailSheet.tsx:24`).
  - `slate500` on `surfaceMuted` measures 4.37:1 for 12-pt labels inside the summary panel (`ActivityScreen.tsx:60`).
- `src/components/SuturaLogo.tsx:28` forces a white tile behind the logo, which shows as a white square in dark mode.

**Icons**
- Text glyphs stand in for icons: `ui.tsx:79,85` uses "›", `NativeControls.tsx:90` uses "⌄", `NativeControls.tsx:102` uses "●/○" radio marks, and `WalletCarousel.tsx:153` uses "→".
- Icon sizes vary across 14/16/18/20/21/22/23/25/30/38. Examples: `HomeScreen.tsx:30` (14), `TransactionRow.tsx:32` (21), `MoreScreen.tsx:31` (23), `MoreScreen.tsx:38` (25), `VerificationScreen.tsx:80` (38).
- `BottomNav.tsx:18` gives More a `person-outline` icon. The merchant app uses `grid-outline` for the same tab (`merchant-app/App.tsx:78`).

**Copy**
- `HomeScreen.tsx:36` "Your next move starts here" is vague. `:37` adds decorative numbered steps (1 Add money, 2 Send, 3 Track) that are not tappable.
- `VerificationScreen.tsx:80` "Let's verify it's you" and "A few simple steps" are marketing-toned.
- `utils/fraudErrors.ts:17` says "Please try again later" for a review hold. This contradicts the rule against retrying a held write. It should say "Check Activity for the result."
- Ellipsis style is inconsistent: `LoginScreen.tsx:121` "Please wait..." uses three dots, while `OperationForm.tsx:134` "Processing…" uses the ellipsis character.
- Vocabulary drift:
  - "Transfer" (`HomeScreen.tsx:26`) vs "Send money" (`MoreScreen.tsx:13`, `WalletActionsSheet.tsx:22`).
  - "Add money" (`HomeScreen.tsx:36`) vs "Top up" (`MoreScreen.tsx:14`).
  - "Log out" (`ProfileScreen.tsx:34`, no confirmation) vs "Sign out" in the agent and merchant apps.
- Raw enums reach the UI: the KYC status (`MoreScreen.tsx:34`, e.g. "NOT STARTED") and the wallet status (`WalletCarousel.tsx:179`, "ACTIVE").
- Clean on the main checks: no emoji or exclamation marks in shipped screens. `utils/format.ts:13` `getGreeting` is unused, and `data/mockCustomer.ts:134` ("Hello Fatou!") is dead data that nothing imports.

**Type**
- Uppercase tracked labels:
  - `WalletCarousel.tsx:228-233`: 10 pt, orange.
  - `WalletCarousel.tsx:281-287`: unused style.
  - `OperationForm.tsx:177`: section label.
  - `OperationForm.tsx:200`: "Amount".
  - `TransactionDetailSheet.tsx:171-172`.
  - `AgentQrCard.tsx:102-103`.
  - `HomeScreen.tsx:50`: eyebrow at 10 pt with letterSpacing 1.
  - `AppHeader.tsx:23` hard-codes "SUTURA" in capitals above the name.
- 800 weights: `AppHeader.tsx:74,96,98`, `ui.tsx:130`, `DonutChart.tsx:87`.
- Negative tracking on figures: `WalletCarousel.tsx:253` (-0.5) and `WalletOverview.tsx:20` (-1).
- Text under 12 pt: `HomeScreen.tsx:51` (10), `WalletCarousel.tsx:265` (10), `TransactionRow.tsx:67` (11), `MoreScreen.tsx:47` (10), `AppHeader.tsx:96` (9).
- No tabular figures anywhere in the app (no `fontVariant` in any of the three codebases).
- `theme.ts:53-58` names Inter fonts, but `NativeControls.tsx:17-24` maps them to System/sans-serif on device. `role-ui-consistency.md` still says Space Grotesk. The tokens and the docs both disagree with what renders.

**Layout**
- `HomeScreen.tsx:26` offers only Transfer and Withdraw. Top up, a core job, is missing from Home.
- `SendScreen.tsx:67-72` has a review step but shows no fee, no "recipient gets" amount and no recipient name.
- `TopUpScreen.tsx:98` and `WithdrawScreen.tsx:74` submit with no review step at all.
- `ui.tsx:49` `AmountDisplay` hard-codes "GMD".

**Details**
- `TransactionRow.tsx:45` shows status by colour only, with no dot. Completed is slate there but emerald in `TransactionDetailSheet.tsx:22`, so the same status has two tones.
- `VerificationScreen.tsx:82` gives REJECTED, FLAGGED and EXPIRED the same orange dot as in-progress.
- `VerificationScreen.tsx:124` hand-rolls a button instead of using `NativeButton`.
- `components/NativeTabBar.tsx` is never imported. `App.tsx:100` renders the JS `BottomNav`, while `native-mobile-ui.md` says native tabs ship.
- Dead styles: `WalletCarousel.tsx:213-220,270-292`.

**Visuals**
- `WalletCardArt.tsx` (whole file) and the empty-state "illustration" rules in `HomeScreen.tsx:35` are filler. The wallet card itself is the right moment, but it should be a quiet, real object rather than glow art.

**Motion**
- Clean. There are no loops or bounces. `NativeControls.tsx:41` gives press feedback through opacity, and `SelectionSheet.tsx:11-18` falls back to fade under Reduce Motion.
- Minor: the press opacity is defined twice, `.72` at `NativeControls.tsx:41` and `.8` at `:56`, and the later style wins.

**Accessibility**
- Missing roles, labels or targets:
  - The wallet eye toggle has no `accessibilityRole` and is a 36-pt target (`WalletCarousel.tsx:97-102,257`).
  - BackHeader is a 36-pt target (`AppHeader.tsx:101`).
  - Contact chips (`OperationForm.tsx:77`) have no role or label.
  - Method tabs (`OperationForm.tsx:98`) have no tab role or selected state.
  - Option rows (`OperationForm.tsx:147`) have no role.
  - The wallet action rows in the sheet (`WalletActionsSheet.tsx:61`) have no role.
  - The empty-wallet card (`HomeScreen.tsx:24`) has no label.
- Dynamic Type risks:
  - `adjustsFontSizeToFit` shrinks amounts instead of wrapping them: `TransactionRow.tsx:42`, `WalletCarousel.tsx:94`.
  - `WalletOverview.tsx:17` computes the balance font size from string length.
  - Fixed-height text boxes clip at larger sizes: `HomeScreen.tsx:52` (24×24 step number) and `AppHeader.tsx:89` (16-pt badge).
  - `NativeTabBar.tsx:14` fixes iOS height at 49.
- `context/ThemeContext.tsx:10` defaults to `"light"`. `mobile-design.md` lists System as an option, and System is the expected default.
- Done well: Reduce Transparency (`GlassBackdrop.tsx:20-27`), the sheet's Reduce Motion fallback, `FormError` with `accessibilityRole="alert"` (`OperationForm.tsx:125`), and 52-pt buttons that grow with font scale (`NativeControls.tsx:52`).

**States**
- `context/WalletContext.tsx:149-150` swallows refresh failures ("screens can pull-to-refresh"), but no customer screen has a `RefreshControl`. Stale balances look current, and there is no offline or timeout banner.
- `HomeScreen.tsx:20` shows a spinner only on first load. There are no skeletons and no error state.
- `MoreScreen.tsx:27` swallows KYC-status errors silently.
- No suspended-account or KYC-required gate exists. `types.ts:22` knows `SUSPENDED`, but the only effect is a disabled picker option (`OperationForm.tsx:42`).
- Done well: retry on verification (`VerificationScreen.tsx:97`), the honest pending-review copy (`WalletContext.tsx:224`) and the receipt share error (`TransactionDetailSheet.tsx:66`).

### 1.2 Agent — `ui/sutura-agent` (light slop)

**Spacing**
- `QueueScreen.tsx:37` and `MoreScreen.tsx:66` set no `gap`, while the other screens use 16. The Activity summary uses an ad-hoc `marginVertical: 20` (`ActivityScreen.tsx:22`).

**Color**
- Two full-orange tiles: `QuickActionGrid.tsx:38`.
- Orange accent bars: `StatsCarousel.tsx:8`, `ActivityScreen.tsx:22`.
- Orange empty-state icons: `HomeScreen.tsx:51`, `ActivityScreen.tsx:24`.
- The same orange glass blob as the customer app, through the shared `GlassBackdrop.tsx:37-38`.
- `theme.ts:26-27,38` adds `amber700/amber100` tokens that only this app has.
- Contrast failures: the login error uses `rose500` at 3.67:1 (`LoginScreen.tsx:105`), and the operation reference uses `slate400` at 2.56:1 (`OperationRow.tsx:70`).
- `ConfirmScreen.tsx:172` gives the note a `blue100` background, which is actually orange-tinted.

**Icons**
- The pending queue uses a bell icon in the header (`AppHeader.tsx:34`) but a clock icon in the nav (`BottomNav.tsx:15`).
- `QuickActionGrid.tsx:13` accepts `color`, but `:26` ignores it, while `HomeScreen.tsx:31,38` still passes colours.

**Copy**
- `LoginScreen.tsx:44` says "Enter your phone number and password." even when the email method is selected.
- `ConfirmScreen.tsx:105` uses three dots in "Confirming...".
- `ConfirmScreen.tsx:78` shows `op.merchantName` where the counter needs the customer's name. Check the DTO field.
- `AppHeader.tsx:23` hard-codes "SUTURA AGENT" in capitals.
- Done well: `AgentContext.tsx:197-199` ("Do not exchange cash; check its status before trying again") and the hint at `NewDepositScreen.tsx:44`.

**Type**
- Uppercase tracked label on the confirmation hero: `ConfirmScreen.tsx:140-141`.
- The direction badge reads "IN"/"OUT" in capitals: `OperationRow.tsx:25`.
- 800 weight with -0.7 tracking: `LoginScreen.tsx:93`.
- 9–10 pt text: `AppHeader.tsx:100`, `OperationRow.tsx:70`.
- No tabular figures: `ConfirmScreen.tsx:143`, `OperationRow.tsx:69`.

**Layout**
- `StatsCarousel.tsx:8` is not a carousel. It shows operation counts only: no cash-in/out totals per currency and no float, which `surfaces.md` requires for agents.
- `ActivityScreen.tsx:22` repeats a count card above the list.
- Cash-in and cash-out create directly with no review step: `NewDepositScreen.tsx:48`, `NewWithdrawalScreen.tsx:48`. Currency is hard-coded "GMD" at `:32` and `:44` in both screens.

**Details**
- `utils/format.ts:28-42` `statusLabel` has no case for `PENDING_REVIEW`, which `types.ts:3` defines, so the raw enum reaches the screen.
- `OperationRow.tsx:15-20` paints FAILED and PENDING_REVIEW grey, and shows status as coloured text only.
- `ConfirmScreen.tsx:79-83` uses an amber pill for every status that isn't completed, FAILED included.
- `ConfirmScreen.tsx:114` shares the receipt as plain text.

**Visuals and motion**
- No decorative art beyond the shared glass blob. Clean.

**Accessibility**
- `components/ui.tsx:49` `FormError` and `LoginScreen.tsx:83` lack `accessibilityRole="alert"`.
- `OperationRow.tsx:23` has no `accessibilityLabel`.
- "See all" (`HomeScreen.tsx:46`) and "View" (`MoreScreen.tsx:44`) have no role.
- BackHeader is a 36-pt target (`AppHeader.tsx:105`).
- `NewDepositScreen.tsx:48` omits `loading` (`NewWithdrawalScreen.tsx:48` has it), so cash-in shows no progress inside the button.

**States**
- Home has no loading, error or offline state (`HomeScreen.tsx:17-55`).
- Done well: Queue and Activity have an inline error, refresh and pull-to-refresh (`QueueScreen.tsx:17,23`), the queue-restore failure copy (`AgentContext.tsx:90`), and the empty Confirm state (`ConfirmScreen.tsx:40-46`).

### 1.3 Merchant — `ui/merchant-app` (light slop, the closest to heavy)

**Spacing**
- Every main screen uses inline styles with no tokens. Padding varies between 22 (`HomeScreen.tsx:17`) and 16 (`:18`), and row padding between 18 (`CollectionsScreen.tsx:62`, `ActivityScreen.tsx:11`) and 16 (`HomeScreen.tsx:20`).

**Color**
- Two orange tiles: `HomeScreen.tsx:18`.
- Two orange buttons in one sheet (the default plus Share): `CollectionsScreen.tsx:68`.
- Three stacked orange primaries: `PendingScreen.tsx:22,24,36`.
- An orange empty-state icon: `MerchantUI.tsx:18`.
- The glass blob behind the inline nav: `App.tsx:86`, via the shared GlassBackdrop.
- "Selected" in orange 12-pt text at 2.8:1: `WalletsScreen.tsx:41`.
- The link colour `orangeDark` measures 3.56:1: `components/ui.tsx:111`.
- The logo has a white tile in dark mode: `components/ui.tsx:72`.

**Icons**
- The terms checkbox is drawn with text glyphs ☑/☐: `registration/AccountScreen.tsx:73`.
- Text chevrons "›": `HomeScreen.tsx:17,20`.
- More uses `grid-outline` (`App.tsx:78`), unlike the customer and agent apps.

**Copy**
- Raw enums reach the screen:
  - `HomeScreen.tsx:20` (`t.status`).
  - `CollectionsScreen.tsx:62` (`c.status`).
  - `CollectionsScreen.tsx:68` (fallback `selected.status`).
  - `ActivityScreen.tsx:11` (`t.status`).
  - `PendingScreen.tsx:21` (`status.replace(/_/g," ")`).
  - `SettingsScreen.tsx:16` (`userStatus.replace`).
- "Create payment QR" (`CollectionsScreen.tsx:61`) vs "Generate merchant QR" (`:66`) name the same action two ways.
- `WalletsScreen.tsx:41` shows "Wallets" in the BackHeader and "Business wallets" as the Heading, so the title appears twice.
- Three dots: "Submitting..." and "Please wait..." (`PendingScreen.tsx:34,36`).
- `BusinessScreen.tsx:54` uses the placeholder "Acme Shop", and `:62` uses the label "City / area".
- Done well: `WelcomeScreen.tsx:21-23` (plain, says what it does for whom).

**Type**
- `WelcomeScreen.tsx:35` is a tracked uppercase eyebrow at 800 weight with letterSpacing 2. `:36` is an 800-weight title.
- `LoginScreen.tsx:84` uses 800 weight with -0.7 tracking.
- Field labels use 700 weight (`components/ui.tsx:82`).
- Three title sizes compete: 30 (`MerchantUI.tsx:13`) vs 26 (customer) vs a 24 left-aligned BackHeader (`AppHeader.tsx:12`).

**Layout**
- `HomeScreen.tsx:17` labels a single wallet "Business balance".
- `HomeScreen.tsx:19` shows three equal count stats with no change reference.
- Recent payment rows open the Activity list rather than the payment (`HomeScreen.tsx:20`).
- Every registration step repeats a 64-pt logo, with the title above the step indicator (`BusinessScreen.tsx:49-51`).

**Details**
- `MerchantUI.tsx:9` `money()` uses the device locale and up to 4 decimals, while customer and agent use en-GB with 2.
- Dates use the device locale: `ActivityScreen.tsx:11` and `CollectionsScreen.tsx:68`.
- Status shows as colour-only text, with PAID green and everything else slate: `CollectionsScreen.tsx:62`.

**Visuals and motion**
- No art. The nav is a third hand-built tab bar (`App.tsx:86-93`) rather than the shared `BottomNav`.

**Accessibility**
- `LinkButton` has no role: `components/ui.tsx:62`.
- The registration error has no alert role: `BusinessScreen.tsx:69`, `AccountScreen.tsx:76`.
- Small targets: the settings icon is about 24 pt with no box (`HomeScreen.tsx:16`), and the back button is padding 8, about 40 pt (`AppHeader.tsx:12`).
- The Activity filter tabs have no `tablist` and no labels: `ActivityScreen.tsx:11`.

**States**
- `App.tsx:84` hides the nav for any status that isn't ACTIVE, but there is no suspended screen. A suspended merchant lands on Home without the nav.
- There are no skeletons.
- Done well: `MerchantUI.tsx:14` `DataNotice` (inline error and Refresh), `MerchantContext.tsx:42-44`, and the pending and correction flow (`PendingScreen.tsx`).

---

## 2. Cross-app inconsistencies

| Area | Customer (reference) | Agent | Merchant |
| --- | --- | --- | --- |
| Money format | `formatMoney` en-GB, 2 dp, optional 4 (`utils/format.ts:1`) | en-GB, fixed 2 dp (`utils/format.ts:3`) | device locale, up to 4 dp (`MerchantUI.tsx:9`) |
| Tabular figures | none | none | none |
| Status display | text colour only; pending orange; pills in detail sheet | text colour; amber for awaiting; PENDING_REVIEW raw | raw enum strings; PAID green only |
| Status tokens | emerald / orange / rose | adds amber700/amber100 (`theme.ts:26`) | same as agent, unused for status |
| Bottom nav | `BottomNav` with glass (`App.tsx:100`) | `BottomNav` copy (Queue tab) | inline in `App.tsx:86-93` |
| Native tabs | `NativeTabBar` unused | unused | unused |
| More icon | `person-outline` | `person-outline` | `grid-outline` |
| More screen | 4-column service grid with search (`MoreScreen.tsx:38`) | list rows with subtitles in orange-tint tiles | plain list with Sign out inline |
| Sign out | "Log out", no confirm (`ProfileScreen.tsx:34`) | "Sign out" with confirm sheet | confirm in Settings; immediate in More (`MoreScreen.tsx:9`) |
| Back header | 36-pt, centred 17-pt title | same | padding 8, left-aligned 24-pt title |
| Screen title | 26 bold (`OperationForm.tsx:161`) | 24 (`AppHeader.tsx:102`) | 30 (`MerchantUI.tsx:13`) |
| Form error | `accessibilityRole="alert"` | no role (`ui.tsx:49`) | role in some screens, not registration |
| Busy ellipsis | mixed "..." and "…" | mixed | mixed |
| Money confirmation | Send review; Top up/Withdraw none | no review before create | Collections: no review (low risk) |
| Theme default | light (`ThemeContext.tsx:10`) | light | light |
| Font tokens | "Inter" names mapped to system | same | `appFonts` plus `fonts` both used |
| Docs drift | `role-ui-consistency.md` says Space Grotesk; `native-mobile-ui.md` says native tabs and 16-pt gutters, but code differs | | |

---

## 3. Zender patterns to adopt

Zender sources: `docs/design/redesign-research-2026-11.md`, `docs/design/mobile-density-research-2026-11.md`, `docs/design/customer-colour-polish.md`, and `packages/ui/src` (`foundation.css`, `theme.css`, `glass.css`, `components.tsx`, `icons.tsx`, `portal.tsx`). Zender's patterns and quality bar come across; its navy/amber stays behind.

| Zender pattern | Where in zender | Sutura target |
| --- | --- | --- |
| **Semantic tone map**: neutral / info / warning / success / danger / muted, always a dot plus a human label | `components.tsx:15-160` (`statusTone`, `Status` with `badge-dot`); `foundation.css:31-42` | New shared `StatusPill` and `statusTone()` in each app's `components/`. Replaces `TransactionRow.tsx:45`, `TransactionDetailSheet.tsx:19-27`, `VerificationScreen.tsx:82`, agent `OperationRow.tsx:15-20` and `ConfirmScreen.tsx:79-83`, and merchant `CollectionsScreen.tsx:62`, `HomeScreen.tsx:20`, `ActivityScreen.tsx:11`, `PendingScreen.tsx:21` |
| **Bottom nav**: SVG line icons, 12-pt labels at weight 600, 48-dp+ targets, no filled pill, neutral text with the active state in ink plus a marker | `portal.tsx:278-285`, `foundation.css:1237-1278`; `customer-colour-polish.md` (no amber indicator, no shadow) | One shared `BottomNav` (customer `components/BottomNav.tsx`) used by all three, including merchant `App.tsx:86`. Active label and icon in `ink` with a 2-pt orange marker instead of orange 12-pt text (2.8:1). Drop the orange blob in `GlassBackdrop.tsx:37-40` |
| **Glass rules**: glass only on the floating control layer, never on content, no tint as decoration, solid under reduced transparency or more contrast | `glass.css:1-16,246-260` | Keep `GlassBackdrop` for tabs and sheets, remove the coloured shapes, and add a `prefers-contrast`-style solid fallback (Android high-text-contrast) |
| **Bottom sheets / drawers** with a title, close button and focus trap | `components.tsx:307-386` (`Drawer`, `Modal`) | Already present (`SelectionSheet.tsx`). Extend to Send/TopUp review, agent review, wallet actions and merchant collection detail. Keep the 44-pt close |
| **Skeletons** that mirror the layout; "nothing yet" vs "no results" | `components.tsx:232-305` (`Skeleton`, `SkeletonRows`, `Empty`) | Home balance and recent rows (customer `HomeScreen.tsx:20`), agent Home/Queue, merchant Home/Collections/Activity. Split the empty states: More search (`MoreScreen.tsx:39`) and merchant Activity search are no-results states, not empty ones |
| **Toasts for success, inline error plus Retry next to the action** | `components.tsx:163-229`; research doc (Cross-cutting) | Add a `ToastProvider` per app (success: "Transfer sent", "Receipt shared", "Wallet created"). Keep the inline `FormError` beside the button. Replace the silent catch in `WalletContext.tsx:149` with a slim stale/offline strip plus Retry |
| **Offline strip**: "Offline · n actions waiting"; never show unsynced as confirmed | research doc (Rider, Offline); `mobile-density-research-2026-11.md` | Customer and merchant: an "Offline · balances from 10:42" strip under the header. Agent: the queue-restore status (`AgentContext.tsx:90`) as a strip, not an inline paragraph |
| **Progressive disclosure**: one current status, the next decision first, admin and diagnostics behind sheets | `mobile-density-research-2026-11.md` (Applied to Rider, Rules) | Customer Home: balance, then a 3-action row, then recent; move "Money movement" (`HomeScreen.tsx:28-32`) into Activity. Agent Home: today's totals per currency and Queue first; history behind "See all". Merchant Home: "Did I get paid" (last payment plus balance), with collection counts collapsed |
| **Keypad-first money and PIN**: one real numeric input, 6 boxes, auto-submit | `rider-web/src/features/rider-ui.tsx:139`; research doc (Rider #5) | `VerificationCodeScreen.tsx:25-30` (all apps): six visual boxes over one input, auto-submit on the sixth digit. `AmountHero` (`OperationForm.tsx:47`) and agent amount fields: large tabular amount with the currency from the wallet, `decimal-pad`, live "Available GMD x" |
| **One sticky primary action** whose label follows state; press-and-hold for irreversible cash steps | `customer-web/src/features/order-flow.tsx:467,539,634` (`sticky-actions`); `rider-ui.tsx:35-132` (hold to confirm) | Send/TopUp/Withdraw review, agent New cash-in/out, agent Confirm ("Complete cash-in · GMD 500.00", hold to confirm), merchant collection sheet. One orange button per screen; secondary actions are neutral |
| **Money component**: tabular numerals, one format | `components.tsx:651-670` (`Money`, en-GB 2 dp); `foundation.css:180` | Shared `Money` text with `fontVariant: ["tabular-nums"]`, en-GB, currency code always visible, no `adjustsFontSizeToFit` |
| **Type scale 28/22/17/15/13** for consumer apps | research doc (Visual language); `foundation.css:172,259-264,524` | `theme.ts` `type` tokens: title 28, section/sheet 22, button and strong body 17, body 15, caption 13 (12 only for tab labels). Weights 400/600, 700 only for the balance figure |
| **Dark tokens** with tone pairs per mode | `foundation.css:68-133` | Extend `darkColors` with tone fg/bg pairs (values in section 4). Default the preference to System |
| **SVG icon set**, one stroke and size | `icons.tsx:1-110` (24 viewBox, 2-px stroke, size 20) | Keep Ionicons outline at 20/24 only. Replace text glyphs (›, ⌄, ●○, →, ☑☐) with Ionicons |
| **56-pt primary targets for counter work**; 17–18-pt base | research doc (Rider #4) | Agent app: primary buttons 56 pt, base text 17 pt (the counter is the agent's "rider" context) |
| **Functional titles**, no slogans; drop decorative footers | research doc (Cross-cutting) | Replace "Your next move starts here", "Let's verify it's you" and "SUTURA" eyebrows with page names |

---

## 4. Direction

Built on the existing Sutura brand (logo, orange as the single action accent, neutral white/charcoal surfaces) with zender's structure and quality bar:

- **Product.** A ledger-backed wallet that lets people in The Gambia send, top up and cash out, lets agents move cash at the counter and lets small merchants know they were paid, with every amount exact.
- **Character.** Exact, calm, a little warm.
- **World.** The counter and the receipt: printed slips, cash drawers and a rubber stamp. Graphite neutrals for the paper and ink, Sutura orange for the one thing to press.
- **Moments.**
  1. The balance figure on Home: large, tabular and set on a quiet wallet card that looks like a real object, with no glow art.
  2. The receipt or confirmation (customer `TransactionDetailSheet`, agent `ConfirmScreen`, merchant Payment QR sheet), laid out like a slip with amount, fee, reference, time and a status stamp.
- **Signature.** One status stamp shared by all three apps: a small dot plus a sentence-case label from zender's tone map, used on rows, receipts, KYC and queue items and nowhere decorative.

**Tokens** (Sutura palette arranged in zender's structure; ratios measured):

| Token | Light | Dark | Note |
| --- | --- | --- | --- |
| background / surface / surfaceMuted | #ffffff / #ffffff / #f5f5f7 | #000000 / #1c1c1e / #2c2c2e | existing |
| ink / muted | #1c1c1e / #5b6577 | #f2f2f7 / #a1a9b5 | #5b6577 is 5.4:1 on #f5f5f7 (today's slate500 is 4.37) |
| line | #e5e5ea | #38383a | existing |
| accent (fills only) | #f97316 with label #181a20 (6.2:1) | #f97316 | never as small text on light surfaces |
| accentText (links, selected text) | #c2410c (5.18:1 on white) | #fb923c | replaces orange/orangeDark text |
| success fg/bg | #047857 / #d1fae5 (4.84:1) | #6fd3a5 / #11301f | zender dark pair |
| warning fg/bg | #7a4f00 / #fdf0d2 | #f6c86a / #3a2a08 | amber-brown; distinct from orange action |
| danger fg/bg | #9f1239 / #ffe4e6 | #ff8c99 / #3d141c | |
| info fg/bg (under review) | #3e4d66 / #eef1f6 | #c5cfdd / #222d41 | graphite, no new hue |
| muted fg/bg (expired, cancelled) | #6b7890 / #f0f2f6 | #8592a8 / #1d2738 | |
| radius | control 12, card 16, sheet 24; inner = outer − padding | | fixes `WalletCarousel.tsx:192/205` |
| spacing | 4-pt grid; gutter 16, section 12/24 | | matches `native-mobile-ui.md` |
| type | 28 / 22 / 17 / 15 / 13, weights 400/600 | | balance display 36 at 700, tabular |

Proposed status mapping:
- **success:** COMPLETED, POSTED, PAID, VERIFIED, APPROVED.
- **warning:** PENDING, AWAITING_AGENT, NOT_STARTED (KYC required), MORE_INFO_REQUIRED.
- **info:** PENDING_REVIEW, REVIEW, FLAGGED, ACTIVE (a collection awaiting payment).
- **danger:** FAILED, REJECTED, SUSPENDED, REVERSED, CLOSED.
- **muted:** EXPIRED, CANCELLED.

Wallet and account `ACTIVE` shows no pill at all.

---

## 5. Top 10 changes, prioritised (shared fixes first)

| # | Change | Files | Size |
| --- | --- | --- | --- |
| 1 | **Status stamp and tone tokens.** Add zender-style `statusTone()` and `StatusPill` (dot plus label), tone fg/bg tokens for light and dark, and labels for every enum, including `PENDING_REVIEW`. Replace every raw enum and colour-only status | `theme.ts` (all 3); new `components/StatusPill.tsx` (all 3); `TransactionRow.tsx:45`, `TransactionDetailSheet.tsx:19-27`, `VerificationScreen.tsx:82`, `MoreScreen.tsx:34`, `WalletCarousel.tsx:179`; agent `utils/format.ts:28-42`, `OperationRow.tsx:15-34`, `ConfirmScreen.tsx:79-83`; merchant `HomeScreen.tsx:20`, `CollectionsScreen.tsx:62,68`, `ActivityScreen.tsx:11`, `PendingScreen.tsx:21`, `SettingsScreen.tsx:16` | M |
| 2 | **One `Money` text and formatter.** Use `fontVariant: ["tabular-nums"]`, en-GB, one decimal rule, currency always visible, and wrap instead of `adjustsFontSizeToFit`. Take currency from the wallet, not "GMD" | `utils/format.ts` (customer, agent), `MerchantUI.tsx:9`; `TransactionRow.tsx:42`, `WalletCarousel.tsx:94`, `WalletOverview.tsx:17-20`, `OperationForm.tsx:203-211`, `ui.tsx:49`; agent `OperationRow.tsx:37`, `ConfirmScreen.tsx:77`, `NewDepositScreen.tsx:32,44`, `NewWithdrawalScreen.tsx:32,44` | M |
| 3 | **Quiet the chrome.** Remove the orange blob from the shared `GlassBackdrop`, the `WalletCardArt` glow and swooshes, the card gradients, the orange accent bars and empty-state icons, uppercase tracked labels, 800 weights and the unused `shadow.fab`. Add a type-scale token (28/22/17/15/13) | `GlassBackdrop.tsx:37-40` (all 3); `WalletCardArt.tsx`, `WalletCarousel.tsx:16-35,171,228-233`; `HomeScreen.tsx:46,50`, `ActivityScreen.tsx:60`; agent `StatsCarousel.tsx:8`, `ActivityScreen.tsx:22`, `ConfirmScreen.tsx:140`; merchant `WelcomeScreen.tsx:35-36`; `theme.ts:53-74` | S |
| 4 | **Orange discipline and contrast.** Use one orange primary per screen; home action tiles become neutral surfaces with ink icons; secondary actions are neutral; add an `accentText #c2410c` token for links and selected text; active tab in ink with an orange marker | `HomeScreen.tsx:26,47`; agent `QuickActionGrid.tsx:38`; merchant `HomeScreen.tsx:18`, `CollectionsScreen.tsx:68`, `PendingScreen.tsx:22,24,36`, `WalletsScreen.tsx:41`; `BottomNav.tsx:43-45`; `LoginScreen.tsx:119,126`; merchant `ui.tsx:111`; `WalletActionsSheet.tsx:105`; agent `LoginScreen.tsx:105`, `OperationRow.tsx:70` | S |
| 5 | **Review before money moves, with one sticky primary.** Customer Top up and Withdraw get the Send review pattern plus fee and "recipient gets" (needs server fee data; do not invent it). Agent cash-in/out get a review sheet (customer name, amount, currency) before create, and press-and-hold "Complete" on Confirm | `SendScreen.tsx:67-72`, `TopUpScreen.tsx:98`, `WithdrawScreen.tsx:74`, `OperationForm.tsx:127-135`; agent `NewDepositScreen.tsx:48`, `NewWithdrawalScreen.tsx:48`, `ConfirmScreen.tsx:105` | M |
| 6 | **State system: skeletons, offline strip, toasts and retry.** Surface refresh failures as an "Offline · balances from hh:mm" strip with Retry, add `RefreshControl` to customer Home and Activity, skeleton rows on first load, and a `ToastProvider` for success | `WalletContext.tsx:149-150`, `HomeScreen.tsx:20`, `ActivityScreen.tsx:43`, `MoreScreen.tsx:27`; agent `HomeScreen.tsx`; merchant `MerchantUI.tsx:14`, `HomeScreen.tsx`; new `components/StateStrip.tsx`, `Skeleton.tsx`, `Toast.tsx` (all 3) | L |
| 7 | **Account-state gates.** Add suspended-account and KYC-required screens or banners, with the action blocked and the reason shown, and a suspended merchant screen instead of Home without the nav | customer `App.tsx:60-110`, `OperationForm.tsx:42`, `types.ts:22`; merchant `App.tsx:84`, `AppContext.tsx:100` | M |
| 8 | **Accessibility primitives.** Roles and labels on chips, tabs, option rows, sheet rows, operation rows and link buttons; alert role on every `FormError`; 44-pt BackHeader, eye and settings targets; replace text glyphs (›, ⌄, ●○, →, ☑☐) with icons; remove fixed-height text boxes; default theme to System | `OperationForm.tsx:77,98,147`, `WalletActionsSheet.tsx:61`, `WalletCarousel.tsx:97-102,257`, `AppHeader.tsx:101` (customer and agent :105), `HomeScreen.tsx:24,52`; agent `ui.tsx:49`, `LoginScreen.tsx:83`, `OperationRow.tsx:23`, `HomeScreen.tsx:46`, `MoreScreen.tsx:44`; merchant `ui.tsx:62`, `AppHeader.tsx:12`, `HomeScreen.tsx:16`, `ActivityScreen.tsx:11`, `AccountScreen.tsx:73,76`, `BusinessScreen.tsx:69`; `ThemeContext.tsx:10` (all 3) | S |
| 9 | **One shell across the three apps.** Shared `BottomNav` with a zender-style 48-dp+ target and marker, used by merchant too; one BackHeader style (44 pt, 17-pt title); one More pattern (customer grid plus grouped settings); delete unused `NativeTabBar.tsx` or wire it in and update `native-mobile-ui.md`; fix the font and gutter docs drift | `BottomNav.tsx` (customer, agent), merchant `App.tsx:74-93`, `AppHeader.tsx` (all 3), agent `MoreScreen.tsx`, merchant `MoreScreen.tsx`; `NativeTabBar.tsx` (all 3); `docs/role-ui-consistency.md`, `docs/native-mobile-ui.md` | M |
| 10 | **Copy and keypad pass.** One vocabulary (Send money, Top up, Sign out with confirm; "Create payment QR"); "…" everywhere; functional titles instead of "Your next move starts here" and "Let's verify it's you"; fraud-hold copy that points to Activity; fix the agent login error for email; six-box code entry with auto-submit | `HomeScreen.tsx:26,36-37`, `VerificationScreen.tsx:80`, `fraudErrors.ts:17`, `LoginScreen.tsx:121`, `ProfileScreen.tsx:34`; agent `LoginScreen.tsx:44`, `ConfirmScreen.tsx:105`; merchant `CollectionsScreen.tsx:66`, `PendingScreen.tsx:34,36`, `WalletsScreen.tsx:41`, `MoreScreen.tsx:9`; `VerificationCodeScreen.tsx:25-30` (all 3) | S |

Agent-specific follow-up outside the top 10: replace `StatsCarousel` with today's cash-in and cash-out totals per currency (never summed across currencies) and float, if the API provides it. If it doesn't, record the gap rather than showing sample numbers.

## Verification still required

Browser exports do not prove Dynamic Type, native glass, haptics, the keypad or press-and-hold feel. After implementation, check each change at 320/390/768 in light and dark, then on physical iOS and Android devices at the largest text size with Reduce Motion and Reduce Transparency enabled.
