# KYC connections on sleeping hosts

KYC has a dedicated HTTP client: `SUTURA_KYC_CONNECT_TIMEOUT_MS=5000` and `SUTURA_KYC_READ_TIMEOUT_MS=20000`. Transaction scoring keeps its separate fast timeout. Set these variables only if overriding the defaults; no additional secret is required.

Customer, merchant and web verification screens share a three-minute connection budget with five-second pauses between transient failures. Individual requests are bounded to thirty seconds. Leaving the screen cancels retries. Authentication and validation errors are not retried. An unavailable service shows a connection notice and a retry action; it does not change a stored verification verdict. Existing hosted links remain usable during status refresh. Terminal locally stored verification records do not trigger an unnecessary Sentinel refresh.

Deploy the Sentinel backend change together with Sutura: session creation reuses an unexpired pending session for the same tenant and external customer identity. A tenant row lock and second lookup protect simultaneous creation after the ML challenge has loaded. Lost responses can therefore be retried without creating multiple active sessions. Expired and completed sessions permit a new attempt.

The Sentinel hosted capture page uses a separate live-only transport with the same bounded loading policy. It never falls back to staff demo data or attaches staff credentials. Evidence submission is sent once; uncertain submission responses require checking the session rather than an automatic evidence replay. Payment writes do not use this policy.

These changes tolerate cold starts; they do not make free hosting always available. If the connection budget expires, the user can try again without receiving a false rejection or approval.

Validation: backend KYC tests, concurrent/repeated session creation integration tests, retry/cancellation tests, mobile type checks and web exports, Next.js/Vite builds, and browser fixtures simulating sleeping services. Browser fixtures are not live KYC accuracy or physical-device checks. Deploy both backends and publish updated frontends/mobile builds before expecting this behaviour in installed apps.
