# Free Render presentation deployment

Prepared 24 October 2026 for Monday 26 October. This is a presentation hosting
configuration, not a production-readiness claim.

## Deploy order

1. Push the reviewed changes in BOTH repositories. Keep them as separate repos.
2. In Render, create a Blueprint from Sutura and select `render-free.yaml` as the
   Blueprint path. This creates one free PostgreSQL, one free Key Value, the API,
   the Next.js admin/developer website, and three Expo static sites (customer,
   agent, merchant). If a database/cache already exists, reuse it rather than
   creating a second free instance. Review the resource list before deployment.
3. In a separate Sentinel Blueprint select its `render-free.yaml`. Enter the SAME
   database host/name/user/password created in step 2. Sentinel uses its own
   `sentinel` schema; Sutura uses `public`. The new Sentinel migration targets a
   fresh schema only. Do not apply it automatically over an existing database.
4. Host ML services using Sentinel's `docs/deploy-huggingface.md`, after checking
   account eligibility. Enter their HTTPS URLs and shared server-only secret on
   Sentinel. No evaluated identity weights are available yet.
5. Set the API origin in every frontend's build settings; rebuild after changing
   it. Use `NEXT_PUBLIC_API_BASE_URL` for the web site,
   `EXPO_PUBLIC_API_BASE_URL` for all three Expo sites, and
   `VITE_API_BASE_URL` for Sentinel's desk. Never put secret keys in those values.
6. Enter all frontend HTTPS origins (without paths/trailing slash) in Sutura's
   `SUTURA_CORS_ALLOWED_ORIGINS`. Set Sentinel's desk origin in
   `SENTINEL_CORS_ALLOWED_ORIGINS` and `SENTINEL_PUBLIC_BASE_URL`.

Render chooses globally unique service subdomains. Copy actual deployed URLs;
do not assume the example service names are available as subdomains.

## Secrets and integration mapping

Configure ModemPay sandbox credentials/signing secret and a live Jokoor API key (`JOKOOR_API_KEY`, starting with `sk_live_`).
Render free services block SMTP ports. This profile therefore uses the Resend
HTTPS email adapter. Set `SUTURA_EMAIL_API_KEY` and a verified `SUTURA_EMAIL_FROM`;
`SUTURA_ALERT_EMAIL` is the monitored destination. SMTP credentials are not needed
for this profile. Real delivery still requires an accepted sender and a live
provider test. See https://resend.com/docs/api-reference/emails/send-email.

Sentinel bootstrap settings map to Sutura settings as follows:

| Sentinel | Sutura |
| --- | --- |
| `SENTINEL_BOOTSTRAP_TENANT_CODE` | `SUTURA_SENTINEL_TENANT_CODE` |
| `SENTINEL_BOOTSTRAP_API_KEY` (32+ characters) | `SUTURA_SENTINEL_API_KEY` |
| `SENTINEL_BOOTSTRAP_WEBHOOK_SECRET` (32+ characters) | `SUTURA_SENTINEL_WEBHOOK_SECRET` |
| API HTTPS origin | `SUTURA_SENTINEL_BASE_URL` |
| `SENTINEL_BOOTSTRAP_WEBHOOK_URL` | Sutura API origin + `/api/v1/webhooks/sentinel` |

Use your own strong Sentinel admin username/password in its bootstrap fields.
No known demo users or documented development API keys are seeded in Render.
The bootstrap does not reset credentials for an existing tenant. After first
successful startup, turn `SENTINEL_BOOTSTRAP_ENABLED=false` and remove bootstrap
password/API-key environment variables (retain the integration key in Sutura).

Sutura's free Blueprint prompts for `SUTURA_BOOTSTRAP_FIRST_NAME`, `LAST_NAME`,
`EMAIL`, `PHONE` and `PASSWORD` (each prefixed `SUTURA_BOOTSTRAP_`). Supply an
international phone number and a password of at least 14 characters, at most 72
UTF-8 bytes. `SUTURA_BOOTSTRAP_ENABLED=true` creates the first admin at startup,
under the existing database advisory lock. An existing admin is never reset.
After success, set it false and remove bootstrap values. Admin sign-in still
requires email 2FA; this feature does not bypass authentication.

## Checks before presenting

- Wait for both API health checks, open every frontend and both ML health URLs.
- Use `server/deployment/smoke.py` against Sutura to check auth boundaries/CORS.
- Register a customer and merchant; complete actual SMS/email delivery checks.
- Verify customer, agent, merchant and admin roles on their respective sites.
- Test a sandbox deposit/transfer/merchant collection, duplicate retry and receipt.
- Show pending/review states honestly. Missing identity models cannot approve KYC.
- Check signed Sentinel callbacks and ModemPay sandbox callbacks.
- Keep a tested local demo available if a provider or sleeping service is down.

## Free-host limits

Render supports only one free PostgreSQL and one free Key Value per workspace.
The database expires after 30 days; Key Value is in-memory. Web services sleep
after idle periods and share the workspace's free-instance-hour allowance.
There is no shell and no persistent disk. Sentinel file uploads and HF SQLite
challenges do not survive service restarts. Use non-sensitive presentation
samples; durable evidence storage, backup/restore and live payment/model
acceptance remain required for a real-money production rollout.

Authoritative limits: https://render.com/docs/free . This configuration does not
create Render resources, accounts, credentials or sender-domain verification.
