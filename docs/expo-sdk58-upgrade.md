# Expo SDK 58 upgrade

Customer, agent and merchant now use Expo 58.0.23, React Native 0.88.1,
React 19.3 and TypeScript 6. Native dependency versions match Expo's SDK bundle.
The shared iOS module targets iOS 16.4. EAS CLI is pinned to 27.5.0 in CI.

Start an app with `npm start -- --clear` and scan with Expo Go for SDK 58.
This explicitly selects Expo Go even though a development client is installed.
Use `npm run start:dev-client` with a custom development build for device-specific
controls and tabs. Expo Go uses the existing fallback components.

The SDK upgrade requires new APKs. Existing SDK 53 installations keep their
compatible runtime and cannot receive SDK 58 updates. Strict fingerprinting
preserves compatibility checks for changes to the local native module.

## Validation

- TypeScript compilation passes for all three apps.
- Expo dependency checks and all 20 Expo Doctor checks pass for every app.
- Android, iOS and web release bundles export for every app.
- All 44 application and shared configuration tests pass.
- Android native project generation passes for all three apps.
- Customer autolinking detects SuturaDeviceUI for Android and Apple platforms.
- Browser checks cover separate OTP entry, invalid code handling, returning to
  login, and wallet creation with the custom currency selector.

Native compilation and testing on actual Android/iOS devices remain separate
from JavaScript exports. Windows cannot compile an iOS application.

See the [official upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
and [SDK 58 release notes](https://expo.dev/changelog/sdk-58).
