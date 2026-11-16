# Sutura mobile design

Customer, agent and merchant use one branded interface on iOS and Android.
Apple Design informs hierarchy, feedback, restraint and accessibility; platform
chrome is not the visual identity of the app.

## Shared decisions

- White light-mode canvas, neutral grouped surfaces and black dark-mode canvas.
- Orange action buttons and selected navigation accents.
- Tab bars and selection sheets use a bounded glass material. Supported iOS 26+
  builds use native Liquid Glass. Android 12+ uses a frosted blur treatment;
  older Android devices use a translucent fallback to avoid expensive blur.
  Reduce Transparency switches these surfaces to solid backgrounds. Payment
  information and action buttons remain sharp above the material.
- System typography on devices, with tight display titles and readable body copy.
- Custom buttons and tab bars stay visually consistent when the native bridge
  is installed. Buttons have a minimum 52-point height, wrap long labels, disable
  repeat submissions and keep progress inside the button.
- Email/phone login methods use a shared segmented selector.
- Inputs have generous touch areas, subtle borders and orange focus feedback.
- Selection sheets use a clear heading, a 44-point close target and a scrollable
  body. They respect Reduce Motion and omit a drag handle because drag-to-dismiss
  is not implemented.
- Native back navigation, safe areas, keyboard behavior and switches remain.
- Common actions respond immediately to press. Do not add decorative entrance
  animation or bouncing payment controls.

## Validation

TypeScript and web release exports cover all three apps. Browser checks cover
login at 320, 390 and 768 pixels, identifier switching, disabled loading buttons
and error recovery. Customer OTP and custom wallet selector flows are checked
with isolated API fixtures. Fixtures and screenshots stay outside the repositories.

Browser results do not establish native motion quality or Dynamic Type behavior.
Review those on physical iOS and Android devices before release.
