# SAMS policy & launch-content input checklist

Status: **owner decisions required before launch.** Nothing below has been
decided or published by the developer. Existing page text was audited, not
rewritten; legal wording must be approved by the owner (and ideally reviewed by
an Omani legal adviser).

Pages audited: `/terms`, `/privacy`, checkout delivery notice, `/orders`,
order-confirmation email template, dashboard WhatsApp templates.

## A. Must fix before launch (current text is inaccurate)

| # | Where | Current text | Why it must change | Owner decision |
|---|---|---|---|---|
| A1 | `/privacy` §4 | "Client databases (stored fallback on client localStorage or structured tables in Supabase)" | Orders/enquiries are no longer stored in the visitor's browser; they are only in Supabase with row-level security. | Approve corrected wording. |
| A2 | `/privacy` §1 | Lists "commercial registration (CR) number" as collected | Checkout/enquiry forms do not collect a CR number. | Remove, or decide to collect it. |
| A3 | `/privacy` §5 | Shares data with "courier services" | Courier/delivery partner is not defined (see C). | Name the delivery method or partner. |
| A4 | `/privacy` | No mention of transactional email | Order confirmations will be sent by an email provider (not chosen yet). | Choose provider; add it as a processor. |
| A5 | `/privacy` | No retention period | Orders, payment records and audit logs are kept; PDPL expects a stated retention approach. | State retention (e.g. tax/financial retention period). |

## B. Refunds / returns (`/terms` §3 currently: 15 days, factory defect only, unopened)

- [ ] Are **card payments** refundable for change-of-mind, or only for factory defects?
- [ ] Return window: keep **15 days**? From purchase or from delivery?
- [ ] Condition: "original packaging, not deployed/activated/damaged" — confirm.
- [ ] Who pays **return delivery**?
- [ ] Refund method: always back to the original card via Paymob? Partial refunds allowed?
- [ ] Refund processing time to state (SAMS side; bank timing is outside SAMS control).
- [ ] Is the delivery charge refundable?
- [ ] Cancellation before dispatch: allowed? Any fee?

## C. Delivery (card payment covers products only; delivery arranged on WhatsApp)

- [ ] Areas SAMS delivers to (all governorates? Muscat only?).
- [ ] How delivery is priced (fixed per governorate? quoted per order?) — **no price has been invented**.
- [ ] Expected timeframe to state. Existing text elsewhere mentions "1-3 business days"
      (dashboard WhatsApp template) and "Sunday to Thursday, 10:00 AM to 5:00 PM"
      (`/orders`, carried over from the previous tracking page) — confirm or remove.
- [ ] Who delivers (SAMS staff / named courier)?
- [ ] Is collection from the Ruwi office offered?
- [ ] How the delivery charge is paid (cash on delivery, bank transfer, second Paymob link?).
      Note: no cash-on-delivery or manual payment feature was added; this is only about wording.

## D. Product claims to verify (existing text, not written by the developer)

- [ ] `/terms` §3 "genuine, imported … meeting national civil defense specifications" — evidence/certificates available?
- [ ] `/terms` §4 "five (5) years … No refilling … or active maintenance" — manufacturer wording is "5-year shelf life"; confirm "maintenance-free" is accurate.
- [ ] `/terms` §4 "They do not trigger by heat alone" — confirm against manufacturer spec.
- [ ] Certificates section shows placeholder entries ("Certificate 4/5", `file_url '#'`) — replace or remove.
- [ ] Testimonials — confirm they are real customers and consent to publication.

## E. Company & contact details

- [ ] Legal name: "SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC" — confirm spelling.
- [ ] Commercial Registration (CR) number — required on invoices/site?
- [ ] Registered address: "Unit No. 2, Al Shumoor Building, Way no 2706, CBD, Ruwi, Muscat" — confirm.
- [ ] Support email for customers (`SUPPORT_EMAIL`) — `info@samsoman.com` is used on the site; is that mailbox active?
- [ ] Order-notification recipient for staff (`ORDER_NOTIFICATION_EMAIL`) — **not configured; no address invented**.
- [ ] WhatsApp number: site uses **+968 7755 4070**. (Marketing notes mention +968 7721 0510 as a possible new number.) Confirm which one customers should use.
- [ ] VAT: are prices VAT-inclusive? Is SAMS VAT-registered (Oman VAT 5%)? Invoices?

## F. Operational decisions that affect the software

- [ ] **Real stock quantities** for all six products (checkout of an item is blocked until its quantity is entered in the dashboard).
- [ ] Low-stock warning level per product (default 3).
- [ ] Staff login emails (current: owner@ / abdulrazzaq@ / abdulwahid@samsoman.com — do these mailboxes exist for password reset?).
- [ ] Email provider for notifications (SMTP via the existing HostGator mailbox, or a transactional service).
- [ ] Paymob **API key** (for refund verification) and confirmation of the Oman Transaction Inquiry path.
