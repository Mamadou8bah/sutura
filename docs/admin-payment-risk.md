# Payment risk in the Sutura admin app

Open **Payments**, or use **Payment risk** on Today / **Transaction risk scores**
on Risk. Each row shows its latest recorded risk score and decision. Open a row
for the payment failure reason, assessment history, Sentinel explanation,
triggered rule, feature contributions, provider transaction and case references.

The displayed 0–100 score is the saved 0–1 anomaly score multiplied by 100. It is
not a fraud probability. A blocked payment is distinct from one held for review;
an allowed assessment does not guarantee that the subsequent payment completed.
Network failures, insufficient funds and older payments may have no assessment.
The UI shows **Not scored** rather than inventing a score for those records.

Only admins can call the list and detail endpoints:

- `GET /api/v1/admin/operations/payments?page=0`
- `GET /api/v1/admin/operations/payments/{id}/risk?page=0`

List responses have a stable `content`, `number`, `size`, `totalPages` and
`totalElements` shape, plus each payment's latest `fraud` summary. Detail responses
page evaluations ten at a time. Summary queries batch the current payment page;
full JSON explanations are read only when a payment is opened. Both persisted
transaction IDs and legacy reference-only evaluations are supported. Malformed
historical explanation JSON leaves the saved score visible and marks the details
unreadable instead of crashing the page. Raw request metadata is not exposed.

The dashboard's transaction counts use typed status parameters. Failed audit
operations are counted in SQL, rather than loading every failed audit row. The
overview reports database connectivity without fabricating provider health or
100% uptime. Payment and audit pagination keep the web client's existing JSON
shape without serializing Spring's internal `PageImpl` structure.
