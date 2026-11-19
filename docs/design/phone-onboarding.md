# Mobile phone entry and onboarding

Updated 19 November 2026 for customer, agent and merchant apps.

- Login offers email or phone. Phone entry uses one shared country selector with
  bundled flags, country names, dial codes and search over 245 countries/territories.
  Gambia is the initial selection. Pasting an international number infers its
  country; national numbers use the selected country. Shared codes such as +1
  are resolved from complete numbers where possible.
- Number parsing uses the pinned `libphonenumber-js/min` metadata. National trunk
  prefixes are handled before submitting E.164, and incomplete numbers, unknown
  calling codes, extensions and embedded prose are refused. The server remains
  responsible for account lookup and authorization.
- Country selection is labelled for assistive technology, shows a selected
  checkmark, closes on selection and returns focus to number entry. Flags are
  decorative alongside text. The field and selector disable during submission.
- Customer signup retains its three stages: name, contact details, password.
  The contact stage uses the same control; back navigation preserves entries.
- Merchant onboarding retains its existing staged business registration. The
  server's Gambian-mobile-only rule is preserved: registration shows the Gambia
  flag and +220, fixes the country, and explains the restriction. Merchant login
  supports the searchable international selector. Selection does not extend
  merchant or payment-provider geographic coverage.
- Agent accounts remain provisioned by authorized staff; the agent app offers
  login and recovery rather than public agent registration.
- Password recovery uses the same number-entry control. Existing recovery
  eligibility and verification rules remain enforced by the server.

Verification: all three TypeScript checks and web exports; 46 customer/shared
regression tests; browser fixtures for country search, no results, international
paste, UK trunk-prefix removal, UK/Gambian login payloads, customer staged signup,
merchant country restrictions, light/dark rendering and 320/390/768-pixel layouts.
The fixture screenshots and runner stay under `.local-validation/country-phone`
in the parent workspace. They do not establish actual OTP delivery, native
keyboard behavior or VoiceOver/TalkBack acceptance.

Parsing reference: https://github.com/catamphetamine/libphonenumber-js
Flag artwork attribution: `ui/shared/country-flags/LICENSE`.
