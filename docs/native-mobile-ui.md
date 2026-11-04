# Platform-native mobile interface

Customer, agent and merchant share the same platform adapters. Mobile uses the
device's system typography, native text fields/keyboards and native buttons.
Android selection uses a native dialog picker; iOS uses the system action sheet.
Inactive wallets cannot be selected and cancellation never changes a selection.
Native switches, permission prompts and sharing remain operating-system controls.

Screen transitions use React Navigation's native stack: UIKit navigation on iOS
and native screens/fragments on Android. Secondary screens use native headers;
their existing page headers update the native title instead of appearing twice.
Android Back retains screen history and local review/registration steps. Hidden
stack screens cannot intercept Back. Authenticated customer/agent trees remount
when the account changes; merchant navigation resets by account scope.

Native safe areas handle status bars, notches and home indicators. Modal windows
have separate safe-area providers. iOS detail selections use page sheets and
Android uses a centered dialog layout. The native appearance is synchronized with
the app's light/dark/system preference.

Mobile does not load Inter fonts or wait on a font network request. Web keeps
Inter and its existing selection-sheet implementation. Sutura dashboard cards,
charts and primary tab-bar composition remain branded React Native views; this
does not reproduce Samsung's proprietary One UI theme.

## Build and update behavior

New native dependencies require replacement APKs built with `production-apk`.
The runtime fingerprint prevents the new JavaScript from being sent to an old
APK that lacks these modules. Keep using the existing Expo-managed signing keys
so the new APK installs over the existing application.

Dependencies are aligned with Expo SDK 53: screens 4.11.1, safe-area-context 5.4.0
and picker 2.11.1. Each application has its own Metro transform cache. Repository
`.easignore` excludes servers, generated output, private environment files and
local training tools from mobile build uploads.

## Validation

TypeScript checks and Android/iOS/web exports are checked for all three apps.
Control tests cover native font mapping, disabled buttons, Android picker
validation, iOS cancellation, disabled selections and adapter parity. Existing
tests retain coverage of input validation, payment review precision, QR parsing,
demo/live isolation and Back history.

No Android device/emulator or iOS simulator was connected during this change.
Exports and tests do not establish physical-device acceptance: verify screen
transitions, interactive back gestures, keyboards, native selection dialogs,
light/dark appearance, receipt windows and text scaling on actual devices.
