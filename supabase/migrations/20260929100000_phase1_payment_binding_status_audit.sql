-- Phase 1 security remediation (additive; safe on the existing schema).
--
-- 1. Payment-to-order binding: a Paymob callback settles only the payment
--    attempt whose SIGNED Paymob order id was bound when the attempt was
--    created. The unsigned merchant reference must agree, never selects.
-- 2. Durable callback inbox: every HMAC-verified callback is stored before it
--    is processed, so a database failure mid-processing never loses money.
-- 3. Staff status changes go through a transition table, with stale-write
--    protection, owner-only financial actions and an append-only audit trail.
-- 4. Reports keep collected money visible regardless of fulfilment status.
-- 5. Rate-limit keys are bounded; order-status access expires.

-- ---------------------------------------------------------------------------
-- 1. Payment binding
-- ---------------------------------------------------------------------------

alter table public.payments
  add column if not exists integration_ids integer[],
  add column if not exists environment text check (environment in ('test', 'live'));

-- One Paymob order belongs to exactly one payment attempt, and one Paymob
-- transaction can settle at most one attempt / one order.
create unique index if not exists payments_provider_order_id_key
  on public.payments (provider_order_id) where provider_order_id is not null;
create unique index if not exists payments_provider_transaction_id_key
  on public.payments (provider_transaction_id) where provider_transaction_id is not null;
create unique index if not exists orders_paymob_transaction_id_key
  on public.orders (paymob_transaction_id) where paymob_transaction_id is not null;

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check (status in (
  'initiated', 'pending', 'successful', 'failed', 'amount_mismatch', 'error', 'superseded'));

-- ---------------------------------------------------------------------------
-- 2. Durable callback inbox
-- ---------------------------------------------------------------------------

create table if not exists public.paymob_callbacks (
  id                uuid primary key default gen_random_uuid(),
  dedupe_key        text not null unique,
  transaction_id    text not null check (char_length(transaction_id) <= 64),
  provider_order_id text check (char_length(provider_order_id) <= 64),
  merchant_reference text check (char_length(merchant_reference) <= 128),
  integration_id    integer,
  amount_minor      bigint,
  currency          text check (char_length(currency) <= 8),
  success           boolean not null,
  pending           boolean not null,
  is_refunded       boolean not null default false,
  is_voided         boolean not null default false,
  is_auth           boolean not null default false,
  is_capture        boolean not null default false,
  payload           jsonb not null,
  status            text not null default 'received' check (status in ('received', 'processed')),
  outcome           text,
  attempts          integer not null default 0,
  last_error        text,
  payment_id        uuid references public.payments (id) on delete set null,
  order_id          uuid references public.orders (id) on delete set null,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz
);
create index if not exists paymob_callbacks_pending_idx on public.paymob_callbacks (received_at) where status = 'received';
create index if not exists paymob_callbacks_payment_id_idx on public.paymob_callbacks (payment_id);
create index if not exists paymob_callbacks_order_id_idx on public.paymob_callbacks (order_id);

alter table public.paymob_callbacks enable row level security;
drop policy if exists paymob_callbacks_owner_read on public.paymob_callbacks;
create policy paymob_callbacks_owner_read on public.paymob_callbacks for select to authenticated
  using ((select public.is_owner()));
revoke all on public.paymob_callbacks from anon;
revoke insert, update, delete, truncate on public.paymob_callbacks from authenticated;

-- Stores one HMAC-verified callback (idempotent on its dedupe key) and returns its id.
create or replace function public.record_paymob_callback(
  p_transaction_id text, p_provider_order_id text, p_merchant_reference text, p_integration_id integer,
  p_amount_minor bigint, p_currency text, p_success boolean, p_pending boolean,
  p_is_refunded boolean, p_is_voided boolean, p_is_auth boolean, p_is_capture boolean, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_id uuid;
begin
  if p_transaction_id is null or p_transaction_id !~ '^[0-9]{1,32}$' then
    raise exception 'INVALID_TRANSACTION_ID';
  end if;
  v_key := p_transaction_id || ':' || p_success || ':' || p_pending || ':' || coalesce(p_is_refunded, false) || ':' || coalesce(p_is_voided, false);

  insert into public.paymob_callbacks (
    dedupe_key, transaction_id, provider_order_id, merchant_reference, integration_id, amount_minor, currency,
    success, pending, is_refunded, is_voided, is_auth, is_capture, payload)
  values (
    v_key, p_transaction_id, nullif(p_provider_order_id, ''), nullif(p_merchant_reference, ''), p_integration_id,
    p_amount_minor, p_currency, p_success, p_pending, coalesce(p_is_refunded, false), coalesce(p_is_voided, false),
    coalesce(p_is_auth, false), coalesce(p_is_capture, false), p_payload)
  on conflict (dedupe_key) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.paymob_callbacks where dedupe_key = v_key;
  end if;
  return v_id;
end;
$$;

-- Money alerts live in their own system-written table (never in editable
-- free-text notes, which have a length limit and can be changed by staff).
create table if not exists public.payment_alerts (
  id           bigint generated always as identity primary key,
  order_id     uuid references public.orders (id) on delete set null,
  callback_id  uuid references public.paymob_callbacks (id) on delete set null,
  kind         text not null check (kind in (
                 'paid_after_cancel', 'duplicate_charge', 'amount_mismatch', 'refund_or_void',
                 'unknown_payment', 'reference_mismatch', 'integration_mismatch', 'authorization_only')),
  message      text not null check (char_length(message) <= 500),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references auth.users (id) on delete set null,
  resolution   text check (char_length(resolution) <= 500)
);
create index if not exists payment_alerts_open_idx on public.payment_alerts (created_at desc) where resolved_at is null;
create index if not exists payment_alerts_order_id_idx on public.payment_alerts (order_id);
create index if not exists payment_alerts_callback_id_idx on public.payment_alerts (callback_id);
create index if not exists payment_alerts_resolved_by_idx on public.payment_alerts (resolved_by);

alter table public.payment_alerts enable row level security;
drop policy if exists payment_alerts_staff_read on public.payment_alerts;
create policy payment_alerts_staff_read on public.payment_alerts for select to authenticated
  using ((select public.is_staff()));
revoke all on public.payment_alerts from anon;
revoke insert, update, delete, truncate on public.payment_alerts from authenticated;

-- Owner closes an alert with a written resolution (who and when are recorded).
create or replace function public.owner_resolve_payment_alert(p_alert_id bigint, p_resolution text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception 'Only the owner can resolve payment alerts' using errcode = '42501';
  end if;
  if p_resolution is null or char_length(trim(p_resolution)) = 0 then
    raise exception 'A resolution note is required' using errcode = '22023';
  end if;
  update public.payment_alerts
     set resolved_at = now(), resolved_by = (select auth.uid()), resolution = left(trim(p_resolution), 500)
   where id = p_alert_id and resolved_at is null;
  if not found then
    raise exception 'Alert not found or already resolved' using errcode = '40001';
  end if;
end;
$$;
revoke execute on function public.owner_resolve_payment_alert(bigint, text) from public, anon;
grant execute on function public.owner_resolve_payment_alert(bigint, text) to authenticated;

-- Applies one stored callback exactly once. Monotonic and idempotent.
create or replace function public.process_paymob_callback(p_callback_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  cb      public.paymob_callbacks%rowtype;
  pay     public.payments%rowtype;
  ord     public.orders%rowtype;
  v_outcome text;
  v_alert   text;
  v_message text;
begin
  select * into cb from public.paymob_callbacks where id = p_callback_id for update;
  if not found then
    raise exception 'UNKNOWN_CALLBACK';
  end if;
  if cb.status = 'processed' then
    return cb.outcome;
  end if;

  update public.paymob_callbacks set attempts = attempts + 1 where id = cb.id;

  -- Resolve ONLY through the signed Paymob order id bound at payment creation.
  if cb.provider_order_id is not null then
    select * into pay from public.payments where provider_order_id = cb.provider_order_id for update;
  end if;

  if pay.id is null then
    v_outcome := 'unknown_payment';
  elsif cb.merchant_reference is not null and cb.merchant_reference <> pay.special_reference then
    v_outcome := 'reference_mismatch';
  elsif pay.integration_ids is not null and (cb.integration_id is null or not (cb.integration_id = any (pay.integration_ids))) then
    v_outcome := 'integration_mismatch';
  else
    select * into ord from public.orders where id = pay.order_id for update;

    if cb.is_refunded or cb.is_voided then
      -- Phase 2 models refunds/voids as separate financial facts; until then
      -- they are recorded and alerted, never silently applied.
      v_outcome := 'refund_or_void_recorded';
    elsif cb.is_auth and not cb.is_capture then
      v_outcome := 'authorization_only';
    elsif cb.pending then
      v_outcome := case when ord.payment_status in ('initiated', 'failed') then 'pending' else 'ignored_stale_pending' end;
    elsif cb.success then
      if ord.payment_status = 'successful' then
        -- Already settled: never touch the successful records; alert instead.
        v_outcome := case when ord.paymob_transaction_id = cb.transaction_id then 'already_paid' else 'duplicate_charge' end;
      elsif cb.amount_minor is distinct from ord.total_minor or upper(cb.currency) is distinct from ord.currency
            or cb.amount_minor is distinct from pay.amount_minor then
        v_outcome := 'amount_mismatch';
      else
        v_outcome := 'paid';
      end if;
    else
      if ord.payment_status = 'successful' or pay.status = 'successful' then
        v_outcome := 'ignored_after_paid';
      elsif exists (select 1 from public.payments p2 where p2.order_id = pay.order_id and p2.id <> pay.id and p2.created_at > pay.created_at) then
        v_outcome := 'failed_superseded';
      else
        v_outcome := 'failed';
      end if;
    end if;
  end if;

  -- Financial effects (payment records and order payment state only).
  if v_outcome = 'paid' then
    update public.payments
       set status = 'successful', provider_transaction_id = cb.transaction_id
     where id = pay.id;
    update public.orders
       set payment_status = 'successful',
           paid_at = now(),
           paymob_transaction_id = cb.transaction_id,
           paymob_order_id = pay.provider_order_id,
           status = case when status in ('pending_payment', 'failed') then 'paid' else status end
     where id = ord.id;
    if ord.status = 'cancelled' then
      v_alert := 'paid_after_cancel';
      v_message := format('Card payment %s arrived after %s was cancelled. Reinstate the order or refund the customer.', cb.transaction_id, ord.order_number);
    end if;
  elsif v_outcome = 'pending' then
    update public.payments set status = 'pending' where id = pay.id and status in ('initiated', 'pending');
    update public.orders set payment_status = 'pending' where id = ord.id;
  elsif v_outcome = 'failed' then
    update public.payments set status = 'failed' where id = pay.id and status in ('initiated', 'pending');
    update public.orders
       set payment_status = 'failed',
           status = case when status = 'pending_payment' then 'failed' else status end
     where id = ord.id;
  elsif v_outcome = 'failed_superseded' then
    update public.payments set status = 'superseded' where id = pay.id and status in ('initiated', 'pending');
  elsif v_outcome = 'amount_mismatch' then
    update public.payments
       set status = 'amount_mismatch',
           last_error = format('Paymob reported %s %s, expected %s %s', cb.amount_minor, cb.currency, ord.total_minor, ord.currency)
     where id = pay.id and status in ('initiated', 'pending', 'failed');
    v_alert := 'amount_mismatch';
    v_message := format('Paymob reported %s %s for %s (expected %s %s), transaction %s. Do not ship; check Paymob.',
                        cb.amount_minor, cb.currency, ord.order_number, ord.total_minor, ord.currency, cb.transaction_id);
  elsif v_outcome = 'duplicate_charge' then
    v_alert := 'duplicate_charge';
    v_message := format('A second card payment %s was captured for %s, which was already paid by %s. Refund one of them.',
                        cb.transaction_id, ord.order_number, ord.paymob_transaction_id);
  elsif v_outcome = 'refund_or_void_recorded' then
    v_alert := 'refund_or_void';
    v_message := format('Paymob reported a refund/void for transaction %s on %s. Check the Paymob dashboard.', cb.transaction_id, ord.order_number);
  elsif v_outcome = 'authorization_only' then
    v_alert := 'authorization_only';
    v_message := format('Paymob reported an authorisation without capture (transaction %s) for %s. The order is not paid.', cb.transaction_id, ord.order_number);
  elsif v_outcome in ('unknown_payment', 'reference_mismatch', 'integration_mismatch') and cb.success and not cb.pending then
    -- A real capture that could not be matched must never go unnoticed.
    v_alert := v_outcome;
    v_message := format('Paymob captured transaction %s (Paymob order %s, %s %s) but it could not be matched to a SAMS order (%s). Check Paymob.',
                        cb.transaction_id, coalesce(cb.provider_order_id, 'none'), cb.amount_minor, coalesce(cb.currency, '?'), v_outcome);
  end if;

  if v_alert is not null then
    insert into public.payment_alerts (order_id, callback_id, kind, message)
    values (coalesce(ord.id, pay.order_id), cb.id, v_alert, left(v_message, 500));
  end if;

  insert into public.payment_events (
    payment_id, order_id, provider_transaction_id, dedupe_key, success, pending, amount_minor, currency, outcome, payload)
  values (pay.id, coalesce(ord.id, pay.order_id), cb.transaction_id, cb.dedupe_key, cb.success, cb.pending, cb.amount_minor, cb.currency, v_outcome, cb.payload)
  on conflict (dedupe_key) do nothing;

  update public.paymob_callbacks
     set status = 'processed', outcome = v_outcome, payment_id = pay.id, order_id = coalesce(ord.id, pay.order_id),
         processed_at = now(), last_error = null
   where id = cb.id;

  return v_outcome;
end;
$$;

-- Recovery sweep for callbacks whose processing failed after durable receipt.
create or replace function public.process_pending_paymob_callbacks(p_limit integer default 20)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_done integer := 0;
begin
  for v_id in
    select id from public.paymob_callbacks
    where status = 'received' and received_at < now() - interval '15 seconds'
    order by received_at
    limit least(greatest(p_limit, 1), 100)
  loop
    begin
      perform public.process_paymob_callback(v_id);
      v_done := v_done + 1;
    exception when others then
      update public.paymob_callbacks set last_error = left(sqlerrm, 500) where id = v_id;
    end;
  end loop;
  return v_done;
end;
$$;

-- Records a processing error on a stored callback without touching its financial state.
create or replace function public.note_paymob_callback_error(p_callback_id uuid, p_error text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.paymob_callbacks set last_error = left(p_error, 500) where id = p_callback_id and status = 'received'
$$;

-- Backward-compatible wrapper for code deployed before this migration. It now
-- binds through the signed Paymob order id like the new path.
create or replace function public.apply_paymob_transaction(
  p_special_reference text, p_provider_order_id text, p_transaction_id text, p_amount_minor bigint,
  p_currency text, p_success boolean, p_pending boolean, p_payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_obj jsonb := coalesce(p_payload -> 'obj', '{}'::jsonb);
begin
  return public.process_paymob_callback(public.record_paymob_callback(
    p_transaction_id, p_provider_order_id, p_special_reference, nullif(v_obj ->> 'integration_id', '')::integer,
    p_amount_minor, p_currency, p_success, p_pending,
    coalesce((v_obj ->> 'is_refunded')::boolean, false), coalesce((v_obj ->> 'is_voided')::boolean, false),
    coalesce((v_obj ->> 'is_auth')::boolean, false), coalesce((v_obj ->> 'is_capture')::boolean, false),
    p_payload));
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Staff status transitions and audit history
-- ---------------------------------------------------------------------------

create table if not exists public.order_status_history (
  id                  bigint generated always as identity primary key,
  order_id            uuid not null references public.orders (id) on delete cascade,
  actor_id            uuid,
  actor_role          text not null,
  from_status         text,
  to_status           text,
  from_payment_status text,
  to_payment_status   text,
  reason              text check (char_length(reason) <= 500),
  created_at          timestamptz not null default now()
);
create index if not exists order_status_history_order_id_idx on public.order_status_history (order_id, created_at);

alter table public.order_status_history enable row level security;
drop policy if exists order_status_history_staff_read on public.order_status_history;
create policy order_status_history_staff_read on public.order_status_history for select to authenticated
  using ((select public.is_staff()));
revoke all on public.order_status_history from anon;
revoke insert, update, delete, truncate on public.order_status_history from authenticated;

create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.order_status_history (
    order_id, actor_id, actor_role, from_status, to_status, from_payment_status, to_payment_status, reason)
  values (
    new.id,
    (select auth.uid()),
    case when (select auth.role()) = 'service_role' then 'system' else coalesce(public.staff_role(), 'unknown') end,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status,
    case when tg_op = 'INSERT' then null else old.payment_status end,
    new.payment_status,
    nullif(current_setting('sams.status_reason', true), ''));
  return new;
end;
$$;

-- Separate insert/update triggers so the update WHEN clause can compare OLD and NEW.
drop trigger if exists orders_status_history_insert on public.orders;
drop trigger if exists orders_status_history_update on public.orders;
create trigger orders_status_history_insert
  after insert on public.orders
  for each row execute function public.log_order_status_change();
create trigger orders_status_history_update
  after update of status, payment_status on public.orders
  for each row
  when (old.status is distinct from new.status or old.payment_status is distinct from new.payment_status)
  execute function public.log_order_status_change();

-- Every non-system status write is checked against this table, whatever path it takes.
create or replace function public.guard_order_staff_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_owner boolean := public.is_owner();
  v_reason text := nullif(current_setting('sams.status_reason', true), '');
  v_paid boolean;
begin
  if (select auth.role()) = 'service_role' then
    return new;
  end if;

  if new.payment_status is distinct from old.payment_status then
    if old.payment_provider = 'paymob' then
      raise exception 'Card payment status is set by Paymob and cannot be edited manually' using errcode = '42501';
    end if;
    if not v_owner then
      raise exception 'Only the owner can record an offline payment' using errcode = '42501';
    end if;
    if not ((old.payment_status = 'unpaid' and new.payment_status = 'verified')
         or (old.payment_status = 'verified' and new.payment_status = 'unpaid')) then
      raise exception 'Payment status change % -> % is not allowed', old.payment_status, new.payment_status using errcode = '42501';
    end if;
    if v_reason is null then
      raise exception 'A reason is required to change a payment status' using errcode = '22023';
    end if;
    if new.payment_status = 'unpaid' and new.status in ('processing', 'shipping', 'delivered', 'completed') then
      raise exception 'Cannot reverse a payment on an order that is already being fulfilled' using errcode = '42501';
    end if;
  end if;

  if new.status is distinct from old.status then
    if not ((old.status, new.status) in (
        ('pending_payment', 'cancelled'), ('failed', 'cancelled'),
        ('paid', 'processing'), ('paid', 'cancelled'),
        ('manual_inquiry', 'placement'), ('manual_inquiry', 'cancelled'),
        ('placement', 'processing'), ('placement', 'cancelled'),
        ('processing', 'shipping'), ('processing', 'cancelled'),
        ('shipping', 'delivered'), ('delivered', 'completed'),
        -- Owner-only reinstatement of a cancelled order (checked below).
        ('cancelled', 'paid'), ('cancelled', 'placement'))) then
      raise exception 'Order status change % -> % is not allowed', old.status, new.status using errcode = '42501';
    end if;

    if old.status = 'cancelled' then
      if not v_owner then
        raise exception 'Only the owner can reinstate a cancelled order' using errcode = '42501';
      end if;
      if v_reason is null then
        raise exception 'A reason is required to reinstate an order' using errcode = '22023';
      end if;
      if new.status = 'paid' and not (old.payment_provider = 'paymob' and old.payment_status = 'successful') then
        raise exception 'Only a card order with a confirmed Paymob payment can be reinstated as paid' using errcode = '42501';
      end if;
      if new.status = 'placement' and old.order_type <> 'quotation' then
        raise exception 'Only quotation orders can be reinstated to placement' using errcode = '42501';
      end if;
    end if;

    v_paid := new.payment_status in ('successful', 'verified');
    if new.status in ('processing', 'shipping', 'delivered', 'completed') and not v_paid then
      raise exception 'Payment must be confirmed before an order can be fulfilled' using errcode = '42501';
    end if;
    if new.status = 'cancelled' then
      if v_reason is null then
        raise exception 'A reason is required to cancel an order' using errcode = '22023';
      end if;
      if v_paid and not v_owner then
        raise exception 'Only the owner can cancel an order that has been paid' using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- Status changes: stale-write protected, audited through the trigger above.
create or replace function public.staff_set_order_status(
  p_order_id uuid, p_expected_status text, p_new_status text, p_reason text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  perform set_config('sams.status_reason', coalesce(left(trim(p_reason), 500), ''), true);
  update public.orders set status = p_new_status
   where id = p_order_id and status = p_expected_status
  returning id into v_id;
  if v_id is null then
    raise exception 'STALE_OR_NOT_FOUND: the order changed since you loaded it; refresh and try again' using errcode = '40001';
  end if;
  return p_new_status;
end;
$$;

-- Offline (quotation) payment confirmation: owner only, reasoned, audited.
create or replace function public.owner_set_offline_payment(
  p_order_id uuid, p_expected_payment_status text, p_new_payment_status text, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can record an offline payment' using errcode = '42501';
  end if;
  perform set_config('sams.status_reason', coalesce(left(trim(p_reason), 500), ''), true);
  update public.orders set payment_status = p_new_payment_status
   where id = p_order_id and payment_status = p_expected_payment_status
  returning id into v_id;
  if v_id is null then
    raise exception 'STALE_OR_NOT_FOUND: the order changed since you loaded it; refresh and try again' using errcode = '40001';
  end if;
  return p_new_payment_status;
end;
$$;

-- Status fields change only through the functions above; notes stay editable.
revoke update (status, payment_status) on public.orders from authenticated;
revoke execute on function public.staff_set_order_status(uuid, text, text, text) from public, anon;
revoke execute on function public.owner_set_offline_payment(uuid, text, text, text) from public, anon;
grant execute on function public.staff_set_order_status(uuid, text, text, text) to authenticated;
grant execute on function public.owner_set_offline_payment(uuid, text, text, text) to authenticated;

revoke execute on function public.record_paymob_callback(text, text, text, integer, bigint, text, boolean, boolean, boolean, boolean, boolean, boolean, jsonb) from public, anon, authenticated;
revoke execute on function public.process_paymob_callback(uuid) from public, anon, authenticated;
revoke execute on function public.process_pending_paymob_callbacks(integer) from public, anon, authenticated;
revoke execute on function public.note_paymob_callback_error(uuid, text) from public, anon, authenticated;
revoke execute on function public.log_order_status_change() from public, anon, authenticated;
grant execute on function public.record_paymob_callback(text, text, text, integer, bigint, text, boolean, boolean, boolean, boolean, boolean, boolean, jsonb) to service_role;
grant execute on function public.process_paymob_callback(uuid) to service_role;
grant execute on function public.process_pending_paymob_callbacks(integer) to service_role;
grant execute on function public.note_paymob_callback_error(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Reporting: collected money stays visible whatever the fulfilment label
-- ---------------------------------------------------------------------------

create or replace function public.get_sales_report(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can view financial reports' using errcode = '42501';
  end if;

  with collected as (
    -- Every order whose money was captured, including ones later cancelled or refunded.
    select o.* from public.orders o
    where o.payment_status in ('successful', 'verified', 'refunded')
      and coalesce(o.paid_at, o.created_at) >= p_from
      and coalesce(o.paid_at, o.created_at) < p_to
  ),
  kept as (
    select * from collected where payment_status in ('successful', 'verified')
  ),
  lines as (
    select i.* from public.order_items i join kept k on k.id = i.order_id
  )
  select jsonb_build_object(
    'gross',            coalesce((select sum(total_amount) from collected), 0),
    'refunds',          coalesce((select sum(total_amount) from collected where payment_status = 'refunded'), 0),
    'revenue',          coalesce((select sum(total_amount) from kept), 0),
    'orders',           (select count(*) from kept),
    'cancelled_paid',   (select count(*) from kept where status = 'cancelled'),
    'cancelled_paid_amount', coalesce((select sum(total_amount) from kept where status = 'cancelled'), 0),
    'units',            coalesce((select sum(quantity) from lines), 0),
    'cost',             coalesce((select sum(unit_cost * quantity) from lines where unit_cost is not null), 0),
    'costed_revenue',   coalesce((select sum(total_price) from lines where unit_cost is not null), 0),
    'uncosted_revenue', coalesce((select sum(total_price) from lines where unit_cost is null), 0),
    'online_revenue',   coalesce((select sum(total_amount) from kept where order_type = 'online'), 0),
    'manual_revenue',   coalesce((select sum(total_amount) from kept where order_type = 'quotation'), 0),
    'pending_payment',  (select count(*) from public.orders where status = 'pending_payment' and created_at >= p_from and created_at < p_to),
    'failed_payment',   (select count(*) from public.orders where payment_status = 'failed' and created_at >= p_from and created_at < p_to),
    'by_month', coalesce((
      select jsonb_agg(m order by m ->> 'month')
      from (
        select jsonb_build_object(
          'month', to_char(date_trunc('month', coalesce(paid_at, created_at) at time zone 'Asia/Muscat'), 'YYYY-MM'),
          'revenue', sum(total_amount),
          'orders', count(*)) m
        from kept
        group by date_trunc('month', coalesce(paid_at, created_at) at time zone 'Asia/Muscat')
      ) x), '[]'::jsonb),
    'by_product', coalesce((
      select jsonb_agg(p order by (p ->> 'revenue')::numeric desc)
      from (
        select jsonb_build_object(
          'product_name', product_name,
          'units', sum(quantity),
          'revenue', sum(total_price),
          'cost', sum(unit_cost * quantity),
          'has_cost', bool_and(unit_cost is not null)) p
        from lines
        group by product_name
      ) y), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Bounded rate-limit keys; expiring order-status access; retire lookup
-- ---------------------------------------------------------------------------

alter table public.rate_limits drop constraint if exists rate_limits_key_length;
-- Old keys may hold raw client header values of any length; they are transient.
delete from public.rate_limits;
alter table public.rate_limits add constraint rate_limits_key_length check (char_length(key) <= 128);

create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  if p_key is null or char_length(p_key) > 128 or p_max < 1 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'INVALID_RATE_LIMIT_ARGUMENTS';
  end if;

  insert into public.rate_limits as rl (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rl.hits + 1 end,
        window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then now() else rl.window_start end
  returning hits into v_hits;

  delete from public.rate_limits where window_start < now() - interval '1 day';
  return v_hits <= p_max;
end;
$$;

-- Order status is readable only with the order's access token, for 7 days.
create or replace function public.get_order_status(p_public_token text)
returns table (order_number text, status text, payment_status text, total_amount numeric, currency text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select o.order_number, o.status, o.payment_status, o.total_amount, o.currency, o.created_at
  from public.orders o
  where o.public_token = p_public_token
    and o.created_at > now() - interval '7 days'
$$;

-- The email/phone order lookup is retired: knowing contact details and an
-- order number is not proof of being the customer.
revoke execute on function public.track_order(text, text) from service_role;
