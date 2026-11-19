# Bundled country flags

Source: `country-flag-icons` 1.6.20, 3:2 flag artwork, by @catamphetamine.
Upstream: https://gitlab.com/catamphetamine/country-flag-icons

The included MIT licence applies to the derived flag images. The 245 supported
country/territory flags are bundled as 96×64 PNGs in each app's `assets/flags`
directory and displayed at 30×20 points. This works without a network connection
or platform emoji support. `CountryFlag.tsx` contains static Metro asset imports;
keep its three copies and the assets synchronized.

Country names and calling codes in `src/data/phoneCountries.json` are generated
from `libphonenumber-js` 1.13.4 metadata and English region display names. Country
availability in a selector is not a statement of payment-provider coverage.
