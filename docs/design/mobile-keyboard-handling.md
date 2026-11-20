# Mobile keyboard handling

Customer, agent and merchant use the same `KeyboardScrollView` implementation
for screen forms, support conversations, device PIN unlock and selection-sheet
searches. Inputs notify the scroll container when focus moves while the keyboard
is already open. Horizontal lists keep their normal behavior.

The container measures the remaining overlap after native resizing or an enclosing
iOS KeyboardAvoidingView, reserves only that space, and scrolls the focused field
into view with room for nearby help text or an action. Android measurements are
translated to the screen coordinates used by keyboard events, including the
status-bar origin. This matters on the Samsung A17: without that correction, the
keyboard toolbar can still clip a button even when the input appears visible.

Forms remain scrollable on small screens. Dragging dismisses the keyboard;
buttons accept the first tap while typing. Bottom navigation is hidden while
the keyboard is visible and restored after dismissal. Keyboard listeners and
pending focus/layout callbacks are removed when a container unmounts.

All three Android app configs explicitly request `softwareKeyboardLayoutMode:
"resize"`. There is no new native library. New APKs pick up the explicit Android
configuration; installed APKs do not change simply because the source changed.

Validation on 20 November 2026:

- TypeScript checks and Android/iOS/web exports for all three apps.
- Unit coverage for covered/visible fields, multiline fields, keyboard resizing,
  avoiding duplicate insets, focus listener cleanup and cross-app parity.
- Customer app tested in Expo Go on the connected Samsung SM-A175F: send-money
  decimal keyboard, automatic field scrolling, action visible above the keyboard,
  and bottom navigation hidden while typing/restored on dismissal. No payment
  submitted. Private screenshot: `.local-validation/keyboard-send-number-pad.png`
  in the parent workspace (not committed).

This device check does not establish iOS hardware behavior or exercise every
authenticated agent/merchant screen. Their shared containers are checked by
TypeScript, exports and parity tests; test the replacement builds on those devices
before treating every workflow as device-verified.
