# SAMS store — Vercel launch runbook

Host: **Vercel**, project `samsllcoman` (team `adulrazzaqs-projects`).
Database: Supabase `sams-llc-store` (ref `dvjfzfiqzvelejwtvtce`, ap-south-1) — functions run in `bom1` (Mumbai) next to it.
Netlify (`samsllcoman.netlify.app`) is retired for this app; see §6.

Stages: **local → Vercel preview (Paymob TEST keys) → Vercel production (Paymob LIVE keys)**.
Nothing moves to the next stage until every box in the current one is ticked.

## 0. Owner decisions / access

| Needed | Why |
|---|---|
| Vercel **Pro** plan on the team | Hobby forbids commercial use and limits cron to once a day (the deploy fails with the 10-minute recovery cron). Pro also unlocks Spend Management. |
| Spend Management **hard limit** (Settings → Billing → Spend Management, "pause projects") | A bot flood can never produce a surprise bill; the site pauses instead. Suggested cap: USD 50/month. |
| Paymob LIVE: secret key, public key, HMAC secret, live card integration id | Production env only. |
| Real stock quantities per product | Checkout refuses products whose quantity is not confirmed. |
| HostGator DNS access for `samsoman.com` | Point apex A / `www` CNAME at Vercel (never change nameservers — mail lives there). |

## 1. Database (hosted) — apply in order, together with the matching app deploy

Already on hosted: `20260927100000` … `20260927100400`.

1. `20260929100000_phase1_payment_binding_status_audit.sql`
2. `20260930100000_phase2_inventory_refunds_notifications.sql`
3. `20261001100000_arabic_content_translations.sql` (generated — `node --experimental-strip-types scripts/generate-arabic-seed.mjs`)

Migration 1 breaks the code currently deployed, so apply 1–3 only when the new build is ready to promote.
After applying: Supabase security advisor clean; RLS on every new table.

## 2. Environment variables

| Variable | Preview | Production |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` (sensitive) | ✓ | ✓ |
| `NEXT_PUBLIC_SITE_URL` | preview URL | `https://samsoman.com` |
| `PAYMOB_BASE_URL` | `https://oman.paymob.com` | same |
| `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`, `PAYMOB_HMAC_SECRET` (sensitive) | **test** keys | **live** keys |
| `PAYMOB_INTEGRATION_ID` | `69632` (test card) | live card integration id |
| `PAYMOB_API_KEY` (sensitive, refund verification) | test | live |
| `CRON_SECRET` (sensitive, ≥32 chars, random) | ✓ | ✓ (different value) |
| `NOTIFICATION_PROVIDER` | `disabled` until an email provider is chosen | same |

`CLIENT_IP_HEADER` is **not** needed on Vercel (`x-vercel-forwarded-for` is inferred from `VERCEL=1`).
The app refuses test keys on production and live keys on previews (`paymob_key_mode_rejected` in logs; card checkout switches itself off).

## 3. Paymob dashboard

- Transaction processed callback: `https://<host>/api/paymob/webhook`
- Transaction response callback (redirect): `https://<host>/api/paymob/return`
- Vercel preview protection blocks Paymob's server-to-server webhook — for the preview test, use a protection bypass or temporarily disable protection, then restore it.

## 4. Preview verification (TEST keys)

- [ ] `/` renders Arabic RTL; `/en` renders English; `/ar/x` → 308 to `/x`; unknown path → branded 404 in the right language.
- [ ] Language toggle keeps the page; cart keeps items and shows names in the active language.
- [ ] Spoof test: request with forged `x-forwarded-for` / `x-vercel-forwarded-for` → rate limit still keys on the real IP (hammer `/api/inquiries` from one machine, expect 429 after 5).
- [ ] Test-card payment end to end (card 5123456789012346, 01/39, CVV 123): webhook marks paid, stock decreases once, redirect returns to the result page in the buyer's language.
- [ ] Re-deliver the same callback: no second effect.
- [ ] Declined card → failure page.
- [ ] Vercel Cron shows `/api/internal/recovery` 200 every 10 minutes; GET without the secret → 401.
- [ ] Mobile Safari + Android Chrome, both languages.
- [ ] Built JS contains no secret prefixes (`omn_sk_`, `sb_secret_`, service-role JWT).

## 5. Production

- [ ] Spend Management hard cap set; Attack Challenge Mode known (Firewall tab → enable during an attack).
- [ ] Firewall rule: rate-limit `/api/*` per IP (e.g. 60 req/min → deny) as an edge layer in front of the app's own limits.
- [ ] Production env = live Paymob keys; `NEXT_PUBLIC_SITE_URL=https://samsoman.com`.
- [ ] Apply migrations (§1) → promote the verified build.
- [ ] Domain: add `samsoman.com` + `www` in Vercel; at HostGator set apex A → Vercel's address and `www` CNAME → `cname.vercel-dns.com`; wait for the certificate.
- [ ] One small real purchase with a real card, then refund it from Paymob; confirm the refund reconciles.

## 6. Netlify

The Netlify site still auto-deploys from GitHub `master` with no env vars. Before pushing this branch to `master`, stop Netlify builds (Site settings → Build & deploy → Stop builds) or delete the site, so the old URL does not serve a half-configured build.
