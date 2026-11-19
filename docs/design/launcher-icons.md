# Mobile launcher icons

The installed-app icon is a dedicated symbol-only asset, not the complete
Sutura logo/wordmark used inside the app. The old launcher configuration had no
explicit adaptive foreground and placed the full transparent wordmark against
a dark background. That made the small wordmark hard to read and did not give
the symbol its own mask-safe layout.

## Assets and colours

Each app has three generated files in `assets/`:

- `app-icon.png`: opaque RGB 1024 × 1024, for iOS and legacy Android.
- `adaptive-icon.png`: transparent 1024 × 1024 Android foreground, with the
  original symbol centred inside the guaranteed safe circle.
- `monochrome-icon.png`: white silhouette with the same alpha, for themed icons.

Customer uses the original orange mark on white. Agent uses a white mark on
Sutura orange. Merchant uses the orange mark on charcoal. Normal launcher
backgrounds distinguish the three apps; themed icons follow the user's OS theme.
Do not add a wordmark, pre-rounded mask, drop shadow or baked-in outer border.
The existing in-app logo remains unchanged.

`app.json` explicitly points `icon`, `ios.icon`, `android.icon`, and the adaptive
foreground/monochrome fields at these files. Android chooses the actual mask;
circle/squircle previews are illustrative, not a Samsung launcher test.

## Regeneration and delivery

Run `node ui/shared/generate-launcher-icons.cjs` from the Sutura root after
installing UI dependencies. The generator uses Sharp from the existing web
installation to extract and resize the original orange symbol deterministically.
No generated replacement logo is used. Re-run validation after changing the
source logo's colours or shape.

Generated local Android mipmaps were refreshed with the installed Expo Android
icon plugin in all three local native projects. On clean EAS/GitHub builds,
Expo prebuild regenerates these resources from the committed config and PNGs.
For a pre-existing native project, refresh native resources before rebuilding;
changing app config alone does not alter an old APK's resources.

**A new native APK/build must be installed to see the launcher changes.** Expo
OTA updates do not replace the Android resource files in an installed binary.

Validation covers resolved Expo configs, square/opaque store artwork,
foreground safe-circle containment, matching monochrome alpha, five Android
density buckets, adaptive XML and background resources. Check the resulting
release APK on a physical launcher before calling the installed icon verified.

References: [Expo icon configuration](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/),
[Android adaptive-icon requirements](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive).
