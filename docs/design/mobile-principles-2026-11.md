# Mobile design review — 19 November 2026

Scope: customer, agent and merchant home shortcuts, shared press feedback and
keyboard focus, bottom navigation labels, login selectors and header targets.
This is not a certification or a review of every screen.

## Research and decisions

- [Apple UI design tips](https://developer.apple.com/design/tips/) recommend clear
  hierarchy, readable text, sufficient contrast and controls at least 44 points
  square. [Android accessibility guidance](https://developer.android.com/develop/ui/compose/accessibility/api-defaults)
  recommends 48 dp touch targets. Updated home/header controls and login selectors
  use the shared 48-point target; primary buttons retain their 52-point minimum.
- [Apple accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility)
  supports adaptable text and redundant cues. Navigation labels now scale without
  the previous 1.3 multiplier cap. Cards wrap rather than reducing the font size;
  statuses retain their text labels. Web pressables have an explicit focus ring.
- [NN/g icon usability](https://www.nngroup.com/articles/icon-usability/) explains
  why labels help clarify icons. Every shortcut keeps a visible action
  label and an accessible button name. Decorative artwork is hidden from assistive
  technology. Small navigation, status and payment controls retain simple icons.
- The local Zender references (`docs/design/redesign-research-2026-11.md` and
  `docs/design/mobile-density-research-2026-11.md`) inform compact task hierarchy,
  details behind labelled disclosures, semantic statuses and clear next actions.
  Sutura retains its white/charcoal palette and orange action accent.

## Icon direction — updated after user feedback

The initial 3D illustration trial was rejected. It has been replaced across all
three apps by `ActionIcon`: flat filled symbols on softly tinted circular
backgrounds, inspired by the shortcuts visible in [Wave's official Google Play
screenshots](https://play.google.com/store/apps/details?id=com.wave.personal).
The shared public listing covers Wave's Gambia/Senegal product; those promotional
screenshots do not establish every current country-specific screen.

Sutura uses existing Ionicons person, arrow, wallet and QR symbols with visible
labels. Category colours distinguish shortcut types; they never communicate a
payment status or selection. Orange remains the primary button/selection accent.
Dark palettes are defined explicitly. No Wave logo or proprietary icon artwork
is bundled. No shadows, gradients, perspective or image assets remain in these
shortcuts. Customer shortcuts use a quiet, borderless layout.

## Additional issue found

Browser review exposed an agent session-restoration race: child read effects could
run before the parent effect updated the authentication handler. The handler now
reads the current session through a ref. The initial history request can therefore
authenticate immediately after a stored session mounts the agent workspace.

## Verification

TypeScript and Expo web release exports run for all three apps. Browser checks
use isolated API fixtures, never real accounts or payment writes, and cover:

- Home at 320, 390 and 768 pixels in light and dark themes.
- Flat icons, absence of rejected 3D assets and labelled shortcut targets at least 48 pixels.
- Visible keyboard focus on shortcuts and no horizontal page overflow.
- Enlarged web text at 320 pixels, including shortcut label containment.
- Agent initial history loading after restoring its session.
- Each app's first shortcut opens its task and back/home restores the home screen
  without submitting a money write. All 41 existing customer/shared regression
  tests pass after these changes.

Screenshots and the fixture runner are private in the workspace's
`.local-validation/mobile-principles` directory. Fixture balances are not live
ledger evidence. Physical iOS/Android Dynamic Type, VoiceOver/TalkBack, native
keyboard and touch usability remain device acceptance checks. Browser text
enlargement is an approximation, not a native Dynamic Type test.
