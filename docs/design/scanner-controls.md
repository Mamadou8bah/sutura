# Camera scanner controls — 20 November 2026

Customer merchant-payment scanning and agent customer-code scanning share the
same native `expo-camera` implementation. The merchant app's collection flow
displays a payment QR rather than opening a camera.

The larger preview has a white corner guide, shaded surroundings and a labelled
flashlight control. The control becomes available after the back camera reports
ready. Its selected appearance, action label and native `enableTorch` value stay
in step. Permissions use the operating system prompt, with a Settings route when
access is permanently denied. Camera startup errors offer a retry.

Leaving the native screen, locking the app or backgrounding it releases the
preview. Backgrounding and successful scan capture reset the light. Stale camera
callbacks cannot deliver a scan after unmount or resume. One camera session
delivers one code; rejected customer codes can be scanned again after retry.
Scanning still only looks up a payment or obtains cash-out review approval;
financial confirmation and server QR validation remain separate.

Verification includes type checks, mobile exports, camera-state tests and visual
fixtures at 320, 390, 768 and 1440 pixels in both themes. The visual fixture uses
a simulated camera surface and does not prove physical torch brightness, camera
focus, scan range or native permission behaviour. Check those on Android/iOS
hardware with a rear-camera flash before claiming device-level acceptance.
