# Automatic Android updates

Customer, agent and merchant APKs use Expo EAS Update. A push to `main` that changes
any mobile app or `ui/shared` runs `.github/workflows/mobile-updates.yml`. After
all three apps pass TypeScript and their available tests, the workflow publishes
Android updates to each app's `production` channel. Backend-only pushes do not
publish mobile updates. You can also run **Publish mobile updates** manually in
GitHub Actions.

## One-time account setup

1. Create or sign in to an account at <https://expo.dev> and create three separate
   projects: `sutura-app`, `sutura-agent`, and `sutura-merchant`.
2. Copy each project's **Project ID** (a UUID) from its Expo project settings.
   The old strings such as `sutura-customer-app` were placeholders, not valid IDs.
   The three apps are now linked in their `app.json` files. The GitHub project-ID
   variables below are optional overrides when using those committed settings.
3. In the Sutura GitHub repository, open **Settings → Secrets and variables →
   Actions**. Add the following repository **variables**:

   | Variable | Value |
   | --- | --- |
   | `SUTURA_CUSTOMER_EAS_PROJECT_ID` | Customer project's UUID |
   | `SUTURA_AGENT_EAS_PROJECT_ID` | Agent project's UUID |
   | `SUTURA_MERCHANT_EAS_PROJECT_ID` | Merchant project's UUID |
   | `SUTURA_API_BASE_URL` | `https://suturagambia.onrender.com` |

4. Create an Expo access token at <https://expo.dev/settings/access-tokens>.
   Store it as the repository **secret** `EXPO_TOKEN`. Do not put it in source
   files or share it in chat. The token must have access to all three projects.
5. In each app's local `.env`, set `EXPO_PUBLIC_API_BASE_URL` to the same API URL
   used by GitHub Actions. `SUTURA_EAS_PROJECT_ID` is only needed to override
   the project already linked in `app.json`. Keep any EAS production environment
   overrides consistent with the build profile and workflow. These values are
   public configuration, not secrets.
6. From each app directory, while signed in with `eas login`, create its update
   channel once (skip this if it already exists):

   ```sh
   npx eas-cli@20.5.1 channel:create production --non-interactive
   ```

   This also supports APKs built locally rather than by EAS Build.

## Build and install the initial APKs

Update support is native code: previously built APKs without `expo-updates`
cannot gain it through an update. Build and install each app once after linking
its real Expo project. From the relevant app directory:

```sh
npx eas-cli@20.5.1 build --platform android --profile production-apk
```

The `production-apk` profile creates an installable APK with the `production`
channel. A local Gradle release build can use the same service: export
`SUTURA_REQUIRE_OTA=1`, set the app's project ID and API URL, then run Expo
prebuild before assembling the APK. Generated Android/iOS folders are ignored;
native configuration must be maintained in app config/plugins, not hand-edited
inside generated folders. Private signing keys remain outside the repository.

## What the user sees

The installed release app checks for updates at launch and downloads compatible
updates in the background. A downloaded update runs on the next launch. Keep
using the app normally; there is no forced reload during a transfer or payment.
Offline launches use the last cached update or the original embedded app.
Updates are not instantaneous while an app is running or closed.

The fingerprint runtime policy prevents an APK from loading an update made for a
different native runtime. TypeScript/JavaScript screens, styles and supported
assets can update over the air. SDK/native dependency changes, permissions,
package identifiers and launcher icons require a new APK and Android installation
confirmation. Android does not allow this workflow to silently replace an APK.
An update with a new fingerprint will not reach older incompatible APKs.

## Verify the complete setup

1. Install the update-enabled `production-apk` build and open it once.
2. Change visible text or a screen style and push to `main`.
3. Confirm **Publish mobile updates** succeeds for all three apps in GitHub
   Actions, and the update appears on the `production` channel in Expo.
4. Open the installed app online, allow the download to finish, then fully close
   and reopen it. Confirm the changed text/style is visible.
5. Check an offline launch still works and live API requests still use the intended
   backend URL. A successful OTA publish does not verify backend availability.

Use the Expo update dashboard's rollback controls if a published update is faulty.
Preview builds use a separate `preview` channel and do not receive production
updates. This workflow does not publish updates to preview builds.

References: [EAS Update setup](https://docs.expo.dev/eas-update/getting-started/),
[GitHub Actions authentication](https://docs.expo.dev/eas-update/github-actions/),
[runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/).
