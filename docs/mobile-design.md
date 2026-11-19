# Sutura mobile design

Customer, agent and merchant use one branded interface on iOS and Android.
Apple Design informs hierarchy, feedback, restraint and accessibility; platform
chrome is not the visual identity of the app.

The [PocketPal direction](design/pocketpal-direction.md) is the latest
home-screen reference: one balance/summary, essential shortcuts, then history.
Secondary counts and explanations appear only when useful or behind a tap.

## Shared decisions

- White light-mode canvas, neutral grouped surfaces and black dark-mode canvas.
- A [first-launch introduction](design/first-launch-onboarding.md) precedes sign-in
  in all three apps. Role-specific welcome slides use bundled AI-generated
  people/wallet images. Skip or completion persists across launches and updates;
  existing signed-in users bypass it.
- Customer home has a My QR action in the balance card, opening the reusable
  [deposit QR](wallet-deposit-qr.md) for agent scanning.
- Orange action buttons and selected navigation accents.
- [Saved sessions and device unlock](device-security-and-cache.md) live under
  More → Settings → App unlock in all three installed apps. PIN/biometrics
  protect local access; server authentication and payment authorization remain.
  Restored cached balances/history show saved-data timestamps until refreshed.
- Orange primary and hold-to-confirm buttons have pill-shaped corners across
  all three apps. Their existing minimum height and loading states remain.
- Tab bars and selection sheets use a bounded glass material. Supported iOS 26+
  builds use native Liquid Glass. Android 12+ uses a frosted blur treatment;
  older Android devices use a translucent fallback to avoid expensive blur.
  Reduce Transparency switches these surfaces to solid backgrounds. Payment
  information and action buttons remain sharp above the material.
- Bundled Poppins typography on iOS, Android and web, with readable body copy.
- Custom buttons and tab bars stay visually consistent when the native bridge
  is installed. Buttons have a minimum 52-point height, wrap long labels, disable
  repeat submissions and keep progress inside the button.
- Email/phone login methods use a shared segmented selector.
- Phone entry uses a searchable country/flag/calling-code selector with Gambia
  selected initially; see [phone onboarding](design/phone-onboarding.md) for
  national-number parsing and the merchant registration country restriction.
- Inputs have generous touch areas, subtle borders and orange focus feedback.
- Selection sheets use a clear heading, a 44-point close target and a scrollable
  body. They respect Reduce Motion and omit a drag handle because drag-to-dismiss
  is not implemented.
- Native back navigation, safe areas, keyboard behavior and switches remain.
- Common actions respond immediately to press. Do not add decorative entrance
  animation or bouncing payment controls.

## Validation

The [November principles review](design/mobile-principles-2026-11.md) records
the research, flat shortcut icons inspired by Wave, scalable navigation labels,
48-point touch targets for updated controls and the scope of browser checks.

TypeScript and web release exports cover all three apps. Browser checks cover
login at 320, 390 and 768 pixels, identifier switching, disabled loading buttons
and error recovery. Customer OTP and custom wallet selector flows are checked
with isolated API fixtures. Fixtures and screenshots stay outside the repositories.

Browser results do not establish native motion quality or Dynamic Type behavior.
Review those on physical iOS and Android devices before release.
