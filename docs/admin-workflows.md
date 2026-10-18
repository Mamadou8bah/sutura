# Admin alignment with the mobile apps



Admin navigation now includes Customers, Merchants, Agents, Identity, Cash-in, Cash-out and Collections, alongside Wallets, Payments, Risk, Reconciliation, Audit and Support.



The seven new directories load admin-only paginated server records (50 per page), with name/reference/account search and status filters applying to the current page, refresh, and record details. Customer records exclude password hashes and authentication secrets. Cash operations expose customer and assigned agent IDs, actual product statuses, amounts and references. Collection statuses follow linked payment state and expiry. Identity records show Sentinel's stored result; admins cannot fabricate a verification result.



Merchant application review supports APPROVED, REJECTED and MORE_INFO_REQUIRED with a required explanation. Live approval requires a pending merchant account and stored VERIFIED identity. Review locks the profile and account, records reviewer/reason/state in the audit trail, and activates the merchant account only on approval. Repeated identical decisions do not duplicate the audit or activation. Rejected applications can be corrected and resubmitted by their authenticated merchant owner. Admins cannot silently turn a rejected application into approval.



The Payments view now loads the latest 50 platform transactions from an admin-only endpoint rather than remaining empty in live mode. Existing webhook reprocessing, reconciliation triggering and mismatch resolution use server endpoints for live sessions. Live errors no longer fall through to successful local risk resolution or summary results.



Demo login uses the regular credentials screen. Demo directories contain representative customer, merchant, agent, identity, cash and collection records, and merchant review can be explored locally. Demo state resets on reload and is independent of mobile demo instances.



Agent provisioning now creates a fixed-role AGENT account with a hashed initial password, international phone and email validation, duplicate checks and an audit reason. Credentials are handed over manually; no message is sent. Customer and agent details support reasoned suspension/restoration. Suspension revokes refresh sessions; access-token authentication and refresh also check account restrictions. Pending or banned accounts cannot be activated through this action. Demo supports creating agents and suspending/restoring accounts locally.



Merchant resubmission and credential recovery are implemented. Broader provider acceptance remains external validation. These additions do not certify deployment or override Sentinel review decisions.


Admin navigation now uses separate `/dashboard/{section}` routes with a desktop sidebar. Account/operation details use `/dashboard/{section}/{id}`, and agent creation uses `/dashboard/agents/new`. Wallet freeze/unfreeze, payment reversal/search/lookups and webhook reprocessing/replay each have a dedicated task page. Record pages support direct loading and reload via an admin-only lookup endpoint, and back navigation returns to the list. Merchant details also expose separate account access state and suspension/restoration, without changing application approval status. Pending applications cannot be activated through the account control. Browser checks covered routed agent creation, suspension/restoration, back navigation, direct record loading/reload and mobile overflow.

Proposal review update (18 October): pending merchant accounts cannot create collection links or receive new transfers; suspended/disabled wallet owners cannot participate in new or approved transfers. Developer keys are revoked through an owned public-ID endpoint. See [proposal audit](proposal-audit.md) for current evidence.

Merchant decision refresh and corrections use `/api/v1/merchant/application` and `/resubmit`. Identity changes invalidate the local KYC grant and queue new verification. Approval provisions a single ledger-linked GMD collections wallet.
