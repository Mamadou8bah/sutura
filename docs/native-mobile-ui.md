# Platform-native mobile interface

Customer, agent and merchant share the same platform adapters. Mobile uses the
device's system typography and native text fields/keyboards. Rebuilt apps use
the shared `ui/shared/modules/sutura-device-ui` Expo module for actual framework
buttons and switches. Android controls use `ContextThemeWrapper` with the public
`Theme.DeviceDefault` light/dark family; this inherits the styling the installed
OS/manufacturer exposes. There are no Samsung-only APIs or device-name checks.
Android selection uses a framework single-choice `AlertDialog` under the same
device theme; iOS selection uses the system action sheet.
Inactive wallets cannot be selected and cancellation never changes a selection.
Native switches, permission prompts and sharing remain operating-system controls.
The app's appearance preference selects light/dark mode for bridged controls.
Button backgrounds, switch tracks, type sizes and shapes belong to the platform
widget rather than a hand-drawn One UI imitation. Branded screen layouts remain
Sutura views. Each manufacturer may expose only part of its first-party styling;
no guarantee is made that controls duplicate every Samsung/Pixel/vendor app.

On iOS the module uses `UIButton` with a system filled configuration and
`UISwitch`, keeping UIKit's supported OS styling. The app retains its native
stack, text input, keyboard, safe areas and system action sheets. Web and old
APKs/Expo Go without the module use the existing controls safely.

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
inherits supported device widget styling rather than bundling Samsung libraries.

## Build and update behavior

New native dependencies require replacement APKs built with `production-apk`.
The runtime fingerprint prevents the new JavaScript from being sent to an old
APK that lacks these modules. Keep using the existing Expo-managed signing keys
so the new APK installs over the existing application.

All three package.json files configure `expo.autolinking.nativeModulesDir` to
`../shared/modules`, so EAS/prebuild discovers a single shared native source.
Do not change the React Activity's AppCompat theme to DeviceDefault: native
widgets use isolated device-themed contexts, preserving Expo/navigation
compatibility. Dialog contexts retain their activity/window token. Open dialogs
are dismissed on detach, module destruction, disabling or theme changes.
Cancellation does not emit a selection; disabled/removed choices are checked
again against current native and JS props before emitting a wallet change.

Reference: Android's [DeviceDefault theme family](https://developer.android.com/reference/android/R.style#Theme_DeviceDefault).

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

For the device-themed bridge: all three apps pass TypeScript and Android/iOS/web
JavaScript exports; both platforms discover the shared module in all apps.
Android fingerprint generation includes the shared native source directory.
The Kotlin bridge compiles against the installed API 35 Android SDK, Expo Core
2.5.0 and React Native 0.79 classes using Kotlin 2.0.21. The complete Gradle build
could not finish because existing third-party plugin dependencies could not be
downloaded; no replacement APK is claimed by these checks. UIKit compilation
requires macOS/Xcode and remains unverified here.

No Android device/emulator or iOS simulator was connected during this change.
Exports and tests do not establish physical-device acceptance: verify screen
transitions, interactive back gestures, keyboards, native selection dialogs,
light/dark appearance, receipt windows and text scaling on actual devices.
