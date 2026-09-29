# Refunds, voids and reconciliation — Phase 2 design (not implemented)

Status: **tracked, not built.** Phase 1 records refund/void callbacks durably and
flags them to staff, but never changes financial state from them.

## What exists after Phase 1

| Piece | Behaviour |
|---|---|
| `paymob_callbacks` | Every HMAC-verified callback is stored with the signed flags `is_refunded`, `is_voided`, `is_auth`, `is_capture`, `has_parent_transaction` (inside `payload`). |
| `process_paymob_callback` | A callback with `is_refunded` or `is_voided` = `true` → outcome `refund_or_void_recorded`, staff note on the order, **no** change to `payment_status`. `is_auth && !is_capture` → `authorization_only` (never paid). |
| `get_sales_report` | `gross` (all captured), `refunds` (orders with `payment_status = 'refunded'`, currently always 0), `revenue` = net. |
| Cancelled but paid orders | Stay in gross/net and raise a "refund or reinstate" alert (`cancelled_paid`). |

## Facts still to verify with Paymob Oman (before building)

1. **Refund callback shape.** Does a refund arrive as (a) the original transaction
   re-sent with `is_refunded=true`, or (b) a new child transaction with
   `has_parent_transaction=true` pointing at the original? The HMAC covers
   `has_parent_transaction` and `is_refunded` but **not** the parent id or the
   refunded amount, so the parent/amount must come from a signed field or from a
   server-side Transaction Inquiry call (authenticated with our secret key).
2. **Partial refunds.** Is `amount_cents` on a refund callback the refunded amount
   or the original amount? Is `refunded_amount_cents` present, and is it signed?
3. **Voids.** Same-day void vs refund semantics in Oman, and whether a void
   callback is ever sent after settlement.
4. **Ordering.** Can a refund callback arrive before the original success
   callback (it must never create a "paid" order)?

Use Paymob's test environment to issue a real test refund (no real money) and
capture the exact callbacks before writing any state change.

## Proposed model

- `payment_refunds` table: `id`, `payment_id`, `provider_transaction_id` (unique),
  `parent_transaction_id`, `amount_minor`, `kind` (`refund` | `void`),
  `source_callback_id`, `confirmed_via_inquiry boolean`, `created_at`.
- A refund is applied **only** when its authenticity and amount are established
  (signed fields, or a server-side inquiry against Paymob that we initiate).
- Order payment state derives from facts: `captured - refunded`:
  - full refund → `payment_status = 'refunded'`
  - partial → new `partially_refunded` status (additive CHECK change)
- Idempotency: unique `provider_transaction_id`; replays are no-ops; a refund for
  an unknown or unpaid payment is stored and flagged, never applied.
- Reports: `refunds` = sum of confirmed refund amounts in the period;
  `net = gross - refunds` (already the report's contract).
- Refunds are **issued in the Paymob dashboard by the owner**; the site only
  reconciles. No refund API calls from the site in Phase 2.

## Out of scope until explicitly approved

Issuing refunds from the SAMS dashboard, auth/capture integrations, chargebacks.
