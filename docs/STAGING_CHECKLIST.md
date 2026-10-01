# SAMS staging checklist (NOT executed — requires human authorisation)

Host: **Netlify, site `samsllcoman`**, in the SAMS owner account
("srabdulrazzaqmhammed20's team"). Do **not** use Vercel. Do **not** touch
`samsoman.com` DNS or the production deploy.

## 0. Human authorisations / access needed

| Needed | From whom |
|---|---|
| Netlify connector or CLI signed in as the SAMS owner account | Owner |
| Approval to create a **non-production** deploy (branch deploy / deploy preview) | Owner |
| Approval to set **non-production-scoped** env vars on `samsllcoman` | Owner |
| Approval to apply migrations to the target Supabase database (see §2) | Owner |
| Paymob **test** API key (Settings → API Keys → "API key") for refund verification | Owner (dashboard login) |
| A test mailbox for notifications, and the chosen email provider | Owner |
| Approval to run one Paymob **test-card** payment and one **test refund** in Paymob's test dashboard | Owner |

## 1. Pre-flight

- [ ] Branch contains Phase 1 (`ee7137b`) + Phase 2 commit; `npm ci && npm run test:unit && npm run build` green.
- [ ] Confirm the Netlify site id `e8f4dc17-87db-45f9-9ac2-f67443ec853d` belongs to the connected account.
- [ ] Decide staging database: **separate Supabase project** (recommended; free plan allows 2 active) or the existing `sams-llc-store` (currently 0 orders).

## 2. Database (in this exact order)

1. `20260927100000_sams_core.sql` *(already on hosted)*
2. `20260927100100_sams_seed.sql` *(already on hosted)*
3. `20260927100200_sams_revoke_trigger_fn_execute.sql` *(already on hosted)*
4. `20260927100300_track_order_details.sql` *(already on hosted)*
5. `20260927100400_track_order_phone_match.sql` *(already on hosted)*
6. `20260929100000_phase1_payment_binding_status_audit.sql` **(new)**
7. `20260930100000_phase2_inventory_refunds_notifications.sql` **(new)**

- [ ] Migrations 6 and 7 must ship **together with** the matching app build (old code breaks against 6).
- [ ] After applying: run the Supabase security advisor; confirm RLS on every new table.
- [ ] Enter **real stock** for the products to be tested (checkout blocks unconfirmed quantities).

## 3. Environment variables (scope: deploy-preview / branch-deploy ONLY)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (secret),
`NEXT_PUBLIC_SITE_URL` (the preview URL), `PAYMOB_BASE_URL`, `PAYMOB_PUBLIC_KEY`,
`PAYMOB_SECRET_KEY` (secret, **test** `omn_sk_test_…` only), `PAYMOB_HMAC_SECRET` (secret),
`PAYMOB_INTEGRATION_ID=69632` (test card integration), `PAYMOB_API_KEY` (secret),
`CLIENT_IP_HEADER=x-nf-client-connection-ip`, `RECOVERY_WORKER_SECRET` (secret, ≥32 chars),
`NOTIFICATION_PROVIDER` (+ provider credentials), `ORDER_NOTIFICATION_EMAIL` (test mailbox), `SUPPORT_EMAIL`.

## 4. Verifications (none of these have been done locally — they need the real host)

1. [ ] Correct Netlify owner account and the existing `samsllcoman` site.
2. [ ] `CLIENT_IP_HEADER` present on requests reaching the Next.js runtime.
3. [ ] **Spoof test:** send a request with a forged `x-nf-client-connection-ip` header; confirm the runtime sees Netlify's value, not the forged one. If Netlify does not overwrite it, STOP and redesign the limiter identity.
4. [ ] Migrations 6 → 7 apply cleanly on the staging database.
5. [ ] Only Paymob **TEST** credentials are configured (`live: false` on the integration).
6. [ ] One real Paymob test-card payment through the preview checkout.
7. [ ] The callback's signed `order.id` equals the stored `payments.provider_order_id` (the binding assumption).
8. [ ] The paid callback updates exactly that order (`payment_events`, `paymob_callbacks.outcome = 'paid'`).
9. [ ] Stock for the purchased product decreases exactly once (`inventory_movements` has one `sale`).
10. [ ] Re-deliver the same callback from the Paymob dashboard: outcome `duplicate`/replay, no second effect.
11. [ ] Paymob redirect returns to `/checkout/result`; the HttpOnly `sams_order_access` cookie is sent on the cross-site return (SameSite=Lax) and the page shows the server state.
12. [ ] Pending / success / failure pages render correctly (use a declined test card for failure).
13. [ ] **Test refund** (partial, then full) from Paymob's test dashboard: callback → verification → Transaction Inquiry path/auth confirmed → `payment_refunds` rows, correct `refunded_minor`; stock unchanged.
14. [ ] Notifications delivered **only** to the approved test mailbox; no real customer address.
15. [ ] Invoke `POST /api/internal/recovery` manually with the bearer secret (scheduled functions only run on published deploys).
16. [ ] Mobile checkout on a real phone (iOS Safari + Android Chrome), including Paymob's page.
17. [ ] No change to `samsoman.com`, DNS, or the production deploy.
18. [ ] Browser bundle contains no secrets (search built JS for key prefixes).
