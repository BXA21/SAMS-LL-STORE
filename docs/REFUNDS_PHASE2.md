# Refunds, voids and reconciliation

Status: **implemented and tested locally against a Paymob mock (Phase 2).**
Not yet verified against Paymob's real test environment (see staging checklist).
The site never issues refunds; the owner refunds in the Paymob dashboard and the
site reconciles.

## Why callbacks are not trusted directly

Paymob's transaction-callback HMAC covers `is_refunded`, `is_voided`,
`has_parent_transaction`, `amount_cents`, `id` and `order.id`, but **not** the
parent transaction id or `refunded_amount_cents`. A refund callback therefore
only *triggers* verification; the money facts come from Paymob Transaction
Inquiry, called by our server with our own credentials.

Documented inquiry fields used: `id`, `amount_cents`, `currency`, `success`,
`pending`, `is_refund`, `is_refunded`, `refunded_amount_cents`, `is_void`,
`is_voided`, `parent_transaction`, `has_parent_transaction`, `order`.

## Flow

1. Signed callback with `is_refunded`, `is_voided` or `has_parent_transaction`
   → stored in `paymob_callbacks` (dedupe key includes a payload hash so
   successive partial refunds are not collapsed) → `refund_verifications` job.
   No payment state changes.
2. Recovery worker claims the job, fetches the reported transaction; if it is a
   child refund/void it also fetches the **parent**.
3. `apply_refund_reconciliation` compares the parent's authoritative cumulative
   `refunded_amount_cents` (or full amount if `is_voided`) with refunds already
   recorded and inserts only the **delta** into `payment_refunds`
   (idempotency key `parent:kind:cumulative`). The same total can never be
   counted twice, whichever callback (child or original) triggered it.
4. Order `payment_status` → `partially_refunded` / `refunded` / `voided`;
   `refunded_minor` updated. The original `payments` row is never rewritten.
5. Staff notification `refund_recorded_staff` queued (idempotent).
6. Refund reported before its payment is applied → `awaiting_parent`, retried.
   Refund total above the captured amount → `refund_inconsistent` alert, not applied.
   Unverifiable after 8 attempts → `refund_verification_failed` alert.
7. Stock is **never** returned automatically. The owner uses
   "Return items to stock" (validated against what was sold, idempotent, audited).

## Reporting

`gross` = captured payments in the period (including later refunded/voided),
`refunds` = sum of `payment_refunds` for those orders, `revenue` (net) = gross − refunds.

## Still to confirm on staging

- Exact Oman Transaction Inquiry path and auth (configurable:
  `PAYMOB_INQUIRY_PATH`, `PAYMOB_AUTH_PATH`, `PAYMOB_API_KEY`).
- Real shape of Paymob's refund/void callbacks (child transaction vs. original
  re-sent) — both are handled; confirm with one partial and one full test refund.
- That `refunded_amount_cents` on the parent is cumulative.
