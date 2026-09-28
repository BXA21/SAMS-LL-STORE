# SAMS LLC — Paymob (Oman) Integration Plan

Status: PLAN — awaiting owner approval. Written 2026-09-27.

## 0. Current state (audit findings)

The repo already contains a Paymob *draft*, but nothing actually persists and several holes would let anyone fake a payment.

| # | Severity | Finding | Where |
|---|---|---|---|
| 1 | CRITICAL | Webhook accepts `{"is_simulated":true,"orderId":…,"success":true}` with no auth — anyone can mark any order **paid** | `src/app/api/paymob/webhook/route.ts` |
| 2 | CRITICAL | No real database. Supabase keys are placeholders, so orders are written to the **visitor's own browser localStorage** — the dashboard never sees a web order | `.env`, `src/services/dbService.ts` |
| 3 | CRITICAL | Admin/sales passwords are `NEXT_PUBLIC_*` env vars — compiled into the public JavaScript bundle; anyone can read them | `src/app/admin/page.tsx:180` |
| 4 | CRITICAL | RLS `orders FOR SELECT USING (true)` — every customer's name/phone/address/email readable with the public anon key; payments too | `db/schema.sql:238,246` |
| 5 | HIGH | Order tracking downloads **all** orders to the browser and filters client-side | `src/app/orders/page.tsx:107` |
| 6 | HIGH | Any authenticated Supabase user = full admin (`FOR ALL TO authenticated USING (true)`) | `db/schema.sql` |
| 7 | HIGH | Checkout input unvalidated server-side: negative/huge quantities, arbitrary strings | `create-payment/route.ts` |
| 8 | HIGH | `paymob_order_id` never saved → webhook falls back to scanning all orders | `create-payment/route.ts:125` |
| 9 | HIGH | Webhook HMAC field list is wrong (missing `is_standalone_payment`, `order.id`; wrong order) and `timingSafeEqual` throws on length mismatch → 500 | `webhook/route.ts` |
| 10 | MED | Uses the legacy 3-call Accept flow + iframe; Paymob's current API is the **Unified Intention API** + Unified Checkout | `create-payment/route.ts` |
| 11 | MED | Quote orders written from the browser with client-supplied prices | `checkout/page.tsx:139` |
| 12 | MED | No idempotency: a replayed/duplicate webhook re-processes; a failed webhook after success could flip a paid order to failed | webhook |
| 13 | LOW | No rate limiting on checkout; no security headers (CSP, frame-ancestors) | `next.config.ts` |

## 1. Target architecture

```
Browser (checkout form)
   │  POST /api/checkout/create-payment   {customer, items:[{productId, qty}]}
   ▼
Next.js route handler (server, Node runtime)
   1. Zod-validate input, rate-limit by IP
   2. Load prices from DB (never from client) → compute total in baisa (OMR×1000)
   3. INSERT order (status pending_payment) + order_items + payments row  [service-role key, server only]
   4. POST https://oman.paymob.com/v1/intention/   Authorization: Token <SECRET_KEY>
        amount, currency OMR, payment_methods [CARD_INTEGRATION_ID], items, billing_data,
        special_reference = <order_uuid>-<attempt>, notification_url, redirection_url
   5. Save intention id / intention_order_id / client_secret on payments row
   6. Return https://oman.paymob.com/unifiedcheckout/?publicKey=…&clientSecret=…
   ▼
Paymob Unified Checkout (hosted, 3-D Secure) — card data never touches our server (PCI scope stays minimal)
   │                                   │
   │ browser GET redirect              │ server POST webhook  (source of truth)
   ▼                                   ▼
/api/paymob/return                   /api/paymob/webhook?hmac=…
 verify HMAC → show result page       1. verify HMAC-SHA512 (20 fields, constant-time) — fail closed
 (display only; never writes "paid")  2. store raw event (payment_events, unique on txn id) → idempotent
                                      3. match by special_reference / Paymob order id
                                      4. re-check amount_cents + currency == our order total
                                      5. optional: re-fetch txn from Paymob inquiry API
                                      6. state machine: pending → paid | failed (paid never downgraded)
   ▼
Supabase Postgres  ◄── Admin dashboard (/admin) via Supabase Auth + role check
   orders: customer name, phone, email, address, items, total, payment status, txn id
```

## 2. Work phases

### Phase 1 — Database (Supabase)
- Dedicated Supabase project for SAMS (see decision D1).
- Migration: harden `orders`, `order_items`, `payments`, `payment_events`:
  - `payments.provider_transaction_id` UNIQUE, `payment_events (provider, provider_transaction_id, event_type)` UNIQUE → idempotency.
  - `orders.order_number` short human reference (e.g. `SAMS-24031`) for WhatsApp/phone use.
  - `CHECK` constraints on status enums, `quantity > 0`, amounts ≥ 0.
- **RLS rewrite:** public = read active catalog only, insert nothing directly. Orders/payments/events: **no anon access at all** — all writes go through server routes with the service-role key. Admin access = `admin_profiles.role IN ('admin','sales')` checked via `auth.uid()`.
- Seed products with the **exact current prices and IDs** from `DEFAULT_PRODUCTS` (prices unchanged).

### Phase 2 — Server payment backend
- `src/lib/paymob.ts`: typed client — `createIntention()`, `checkoutUrl()`, `verifyTransactionHmac()` (POST body + GET query variants), `inquireTransaction()`.
- `src/lib/supabaseAdmin.ts`: service-role client, `import 'server-only'`.
- Rewrite `POST /api/checkout/create-payment` (Zod, price recompute, intention, persistence).
- New `POST /api/checkout/quote` — quotation orders move server-side (no client prices).
- Rewrite `POST /api/paymob/webhook` — remove simulated backdoor, correct HMAC, idempotent state machine, amount check.
- Rewrite `GET /api/paymob/return` — HMAC-verified display redirect.
- New `POST /api/orders/track` — lookup by order number **and** email, returns only that order's safe fields, rate-limited.
- Delete `/paymob-simulate` (or gate to `NODE_ENV=development` + no DB write path).

### Phase 3 — Admin dashboard wiring (no redesign)
- Replace `NEXT_PUBLIC_*` passwords with Supabase Auth accounts (admin + 2 sales) created server-side.
- Orders tab reads real DB: paid / pending / failed / quote filters; each order shows customer name, phone (tap-to-call / `wa.me` link), email, address, items, total, Paymob transaction id, paid-at → the "invoice" view for delivery.
- Status updates (processing → shipping → delivered) via authenticated server route.

### Phase 4 — Hardening
- Security headers in `next.config.ts` (CSP allowing `oman.paymob.com`, HSTS, frame-ancestors none, nosniff).
- In-memory/IP rate limiting on checkout, quote, track.
- Env validation at boot (Zod) — server secrets never prefixed `NEXT_PUBLIC_`.
- Structured server-side error logging; generic user-facing messages.

### Phase 5 — Verification
- `tsc --noEmit`, `eslint`, `next build`.
- Unit tests for HMAC against Paymob's documented worked example.
- Negative tests: forged webhook (bad HMAC) → 401 no state change; replayed webhook → no double processing; tampered price/qty → rejected; amount mismatch → not marked paid; unauthenticated admin API → 401.
- End-to-end in **Paymob test mode** with test card `5123456789012346`, 01/39, CVV 123: pay → webhook → order `paid` in dashboard.
- `/guardian` sign-off before anything goes live.

### Phase 6 — Go-live (later, not now)
Netlify env vars, switch test → live keys, set Paymob webhook to `https://samsoman.com/api/paymob/webhook`, point domain DNS.

## 3. Credentials needed (`.env` in VS Code)

From Paymob Oman dashboard (`https://oman.paymob.com/portal2/en/login`) → **Settings → Developers → API Keys** (use the **Test** toggle first):

| Variable | What it is | Where |
|---|---|---|
| `PAYMOB_SECRET_KEY` | starts `omn_sk_test_…` | API Keys |
| `PAYMOB_PUBLIC_KEY` | starts `omn_pk_test_…` | API Keys |
| `PAYMOB_API_KEY` | long token (same for test & live) | API Keys |
| `PAYMOB_HMAC_SECRET` | HMAC secret | API Keys |
| `PAYMOB_INTEGRATION_ID` | the **Card** integration id (test) | Settings → Payment Integrations |

`PAYMOB_IFRAME_ID` is no longer needed (Unified Checkout replaces the iframe).
Never paste the dashboard **username/password** into `.env` or chat.

## 4. Local testing note
Paymob's server webhook cannot reach `127.0.0.1`. For the local end-to-end test we run a temporary Cloudflare quick tunnel (`cloudflared`, no account, closed after the test) and point `notification_url` at it. Without it, only the redirect path is testable locally.

## 5. Sources
- Paymob Create Intention: https://developers.paymob.com/paymob-docs/intention-apis/create-intention
- HMAC transaction callback: https://developers.paymob.com/paymob-docs/developers/webhook-callbacks-and-hmac/hmac/hmac-transaction-callback
- Transaction inquiry: https://developers.paymob.com/paymob-docs/developers/transaction-inquiry-apis/transaction-inquiry/by-transaction-id
- Credentials: https://developers.paymob.com/paymob-docs/need-help/setup-guides/getting-integration-credentials
- Official MCP: https://developers.paymob.com/paymob-docs/ai-solutions/model-context-protocol-mcp
- Postman collections: github.com/PaymobAccept/API-Postman-Collections (OMN environment)
- OMR ×1000 minor units: official Paymob WooCommerce plugin source (verify with first test intention)
