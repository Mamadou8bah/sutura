# Saved sessions, app unlock and cached data

Customer, agent and merchant keep their existing authenticated session between
launches. The server's source defaults are a **15-minute access token** and a
**7-day refresh token** (`JWT_ACCESS_TOKEN_EXPIRATION_MINUTES` and
`JWT_REFRESH_TOKEN_EXPIRATION_DAYS`). Deployment overrides may differ. Successful
refresh consumes the old refresh token and issues another with a new expiry;
normal use renews the session without another password prompt. Expiry, revocation
and account restrictions still require server sign-in.

Refresh connection errors, 5xx replies, malformed JSON and incomplete responses
keep the stored session. Only refresh rejection (401/403), a missing refresh
token, or a second rejected access token clears it. Concurrent requests share a
refresh; responses for a previous account cannot update the new account. New
writes are blocked while locally locked. Failed money writes are not cached or
queued for replay.

## Local app PIN and biometrics

Open **More → Settings → App unlock** in any installed app. Create a six-digit
PIN and confirm it. Repeated/consecutive digit sequences are rejected. PIN change,
PIN removal and biometric enrollment/removal require the current app PIN.
Biometrics are optional and require an enabled app PIN, enrolled strong device
biometrics and successful OS authentication. The protected biometric secret is
released using SecureStore's `requireAuthentication`, not a UI preference alone.
If enrolled biometrics change or the prompt is cancelled, use the app PIN.

The app locks on restart and after **30 seconds away**; it conceals account content
while inactive. Lock app now is available in settings. Unlocking preserves the
screen and triggers read refreshes. Customer and agent camera previews unmount
while the app is covered/locked, even when Scan remains the selected route.
The PIN unlocks local access to a saved server
session; it does not extend token validity or authorize payments. Forgotten PIN
recovery signs out locally and requires the account password/normal server 2FA.

PIN verifiers use PBKDF2-HMAC-SHA256 (600,000 iterations, random 16-byte salt,
32-byte result). Neither the raw PIN nor biometric data is saved. Credentials,
failure counts and cooldowns live in the native secure vault, with device-only
keychain accessibility. Attempts are recorded before verification. After five
failed attempts, subsequent attempts require a 60-second cooldown. Ten failures
require password sign-in. Unreadable native unlock settings fail closed.

Native authentication tokens require SecureStore; there is no plaintext
AsyncStorage fallback on Android/iOS. Web previews retain their existing web
session mechanism, offer no simulated PIN/biometric security, and explain that
local unlock is available in the installed apps.

## Read cache

The last successful customer dashboard, agent pending/completed operations and
merchant wallets/collections/payments are cached per role and account. Snapshots
are accepted for 24 hours. The persisted snapshot contains at most 200 recent
transactions/completed operations and 100 collections/pending operations. It is
not the complete ledger or a source of payment authorization.

On Android/iOS, snapshots are AES-256-GCM encrypted with fresh nonces and an
account-bound authenticated context. Only ciphertext is placed in AsyncStorage;
the encryption key is in the native secure vault. Tokens, PINs, OTPs and submitted
payment instructions are excluded. Web previews use an in-memory cache only.

Cache restoration cannot replace a newer successful server response. Restored
data is marked as saved/stale and includes its timestamp until verified online.
Automatic reads stay quiet, pause while backgrounded/locked and preserve state
when the response is unchanged. Unchanged content does not rewrite the encrypted
snapshot more frequently than every five minutes; changed data is saved immediately.
Server results replace collections rather than repeatedly appending duplicate
rows. Successful server writes retain their existing idempotency/receipt flows.

Sign-out clears that account's native PIN, biometric key, cached snapshot and
cache encryption key along with the session. Cache corruption/tampering or a
missing encryption key is treated as a cache miss, never fabricated data.

## Native build and validation

**Build and install a new APK/iOS app:** `expo-local-authentication` and
`expo-crypto` are native dependencies. Face ID usage text is configured in every
Expo app. Do not publish this change to a binary lacking those modules; the
existing fingerprint runtime policy separates incompatible native builds.

Tests cover encryption/tampering/account isolation, cache expiry, unchanged-data
writes, PIN hashing/weak-PIN rejection, retry limits, secure-write errors, biometric
key release/cancellation, local gate concealment and resume, sign-out cleanup,
refresh failure handling and account switches. Mocks exercise OS APIs; they do
not prove physical biometric enrollment, prompts, app-switcher snapshots or
native keychain behavior. Verify fingerprint/Face ID enrollment, cancellation,
changed biometrics, restart, background lock and offline return on real devices.

Sources: [Expo LocalAuthentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/),
[SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/),
[Expo AES encryption](https://docs.expo.dev/versions/latest/sdk/crypto/),
[noble-hashes](https://github.com/paulmillr/noble-hashes).
