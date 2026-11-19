# PocketPal direction

The reference is [PocketPal by Kaviyadharshini S / aspira design](https://www.behance.net/gallery/197846977/PocketPal-E-Wallet-App-UI-Design).
Use its centred balance, circular actions, service shortcuts and plain history rows
across customer, agent and merchant. Keep Sutura's logo, orange action colour,
white/charcoal themes and actual role-specific workflows.

The public project does not identify the font. Poppins is a visual approximation,
bundled in four weights on all platforms; it is not a confirmed original font.
Do not copy unsupported charts, virtual cards or reference balances into the app.

Money surfaces stay opaque. Navigation and selection sheets retain bounded
[Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/liquid-glass)
on supported iOS builds, with existing blur/solid fallbacks on other devices and
Reduce Transparency support. Android does not run Apple's native material.

My QR opens the selected wallet's deposit code from the customer balance card.
Send money, Top up, Withdraw and My QR share that card's action row. Customer
Home has no separate Services section. At increased native text sizes, actions
may wrap to preserve readable labels and usable targets.
Create wallet shows available currencies as labelled radio rows, with full
currency names, an editable wallet name and one orange creation button. A
currency already held is excluded; selection follows the first available option
if the initial wallet read changes availability. The all-currencies state links
back to Wallets. Creation still uses the existing API and submission lock.
More is an account page: profile, identity verification, settings and support.
Payment shortcuts and the unnecessary service search are removed from this page.
Bottom navigation follows the locally supplied YouPay reference: five labelled
destinations with a raised central circle (Scan for customers/agents, Collect for
merchants), retaining the glass background and safe-area container. Customer
Home no longer repeats Scan, Wallets and Support shortcuts; merchant Home no
longer repeats the Wallets shortcut. Selection remains explicit to assistive
technology and includes a visible dot as well as colour.
Scanning still reads the destination only; amount review and explicit cash-in
completion remain required. Account restrictions and stale-data warnings remain.

Verification uses isolated browser fixtures, TypeScript, shared behaviour tests
and Expo exports. Native material, camera, motion and accessibility scaling still
require physical-device checks. Local screenshots are not live account data.
