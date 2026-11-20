# Customer payment refinements

20 November 2026.

Balance visibility controls apply to wallet balances. Transaction rows, accessible
transaction labels and Activity totals remain visible when the wallet balance is
hidden. The amounts on confirmation screens remain explicit.

Wallets uses the same compact icon actions as Home for Top up, Withdraw and Send.
Actions are disabled for an inactive selected wallet. The green identity badge
is removed from the More profile block; identity verification remains accessible
from its normal account row. Top-up and withdrawal use a plain amount section
and a compact wallet selector to reduce stacked cards.

Send and mobile-money top-up offer phone contact suggestions. Permission is
requested only when the customer chooses Use phone contacts. If already allowed,
names and phone numbers are read into memory and matched locally after at least
two digits. Up to five matching numbers are shown; choosing one fills the field
without submitting a transfer or checking whether that person has a Sutura account.
The backend remains responsible for recipient validation. No address-book upload,
contact modification or persisted address-book cache is added. Manual entry works
when permission is denied, on web or on a build without the contacts module.

The customer app now includes Expo Contacts. Replacement builds are required to
include the module and permission declarations. Config introspection verifies
READ_CONTACTS and explicitly removes WRITE_CONTACTS on Android, plus the iOS
usage description. Limited iOS contact access is respected by the platform API.

The reported failed transfer received HTTP 502 from Sentinel. Fraud scoring now
retries once only for 502/503/504 using the same external transaction ID, which
Sentinel deduplicates and checks against the original payload. The wallet write is
never retried. Exhausted attempts, timeouts, rejected credentials and invalid
decisions still fail closed. Provider response HTML is no longer copied into the
Sutura error log. Unavailability is described separately from an actual fraud block.

Validation: customer TypeScript; Android/iOS/web exports; 92 mobile tests;
28 targeted backend fraud/transfer tests; 36 fixture screenshots across
320/390/768 widths in both themes, including the hidden-balance transaction check.
Private evidence is under `.local-validation/customer-refinement-*` in the parent
workspace. Screenshots use mocked accounts and requests, not live payments.
Contact permission and matching still need device testing in the replacement build.
Live Sentinel liveness checks timed out during this work; the retry does not repair
a sleeping or unhealthy deployment.
