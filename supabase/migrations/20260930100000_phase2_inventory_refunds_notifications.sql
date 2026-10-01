-- Phase 2: inventory with reservations, refund/void reconciliation, durable
-- notification outbox, recovery-worker primitives, reporting.
-- Additive and re-runnable. Apply after 20260929100000 (Phase 1).

-- ===========================================================================
-- 0. Order / payment columns
-- ===========================================================================

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (payment_status in (
  'initiated', 'pending', 'successful', 'partially_refunded', 'refunded', 'voided', 'failed', 'cancelled', 'unpaid', 'verified'));

alter table public.orders
  add column if not exists refunded_minor  bigint not null default 0 check (refunded_minor >= 0),
  add column if not exists inventory_state text   not null default 'none'
    check (inventory_state in ('none', 'reserved', 'committed', 'released', 'shortfall')),
  add column if not exists checkout_key    text   check (checkout_key ~ '^[A-Za-z0-9-]{16,64}$'),
  add column if not exists client_key      text   check (char_length(client_key) <= 128);
create index if not exists orders_client_key_open_idx on public.orders (client_key) where inventory_state = 'reserved';
create unique index if not exists orders_checkout_key_key on public.orders (checkout_key) where checkout_key is not null;

-- Money that Paymob captured at some point (refunds are separate facts).
create or replace function public.is_captured_payment(p_status text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_status in ('successful', 'partially_refunded', 'refunded', 'voided')
$$;

-- Payment state that still allows fulfilment.
create or replace function public.is_payment_confirmed(p_status text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_status in ('successful', 'partially_refunded', 'verified')
$$;

-- ===========================================================================
-- 1. Inventory
-- ===========================================================================

-- Real quantities are unknown, so every product starts TRACKED with 0 on hand
-- and quantity_confirmed = false: card checkout cannot oversell until the owner
-- enters real stock. (products.stock was a seeded placeholder and is ignored.)
create table if not exists public.product_inventory (
  product_id          uuid primary key references public.products (id) on delete cascade,
  track_inventory     boolean not null default true,
  stock_on_hand       integer not null default 0 check (stock_on_hand >= 0),
  stock_reserved      integer not null default 0 check (stock_reserved >= 0),
  stock_available     integer generated always as (stock_on_hand - stock_reserved) stored,
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  quantity_confirmed  boolean not null default false,
  updated_at          timestamptz not null default now(),
  constraint product_inventory_reserved_le_on_hand check (stock_reserved <= stock_on_hand)
);

insert into public.product_inventory (product_id)
select p.id from public.products p
on conflict (product_id) do nothing;

create or replace function public.ensure_product_inventory()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.product_inventory (product_id) values (new.id) on conflict (product_id) do nothing;
  return new;
end;
$$;
drop trigger if exists products_ensure_inventory on public.products;
create trigger products_ensure_inventory after insert on public.products
  for each row execute function public.ensure_product_inventory();

drop trigger if exists product_inventory_updated_at on public.product_inventory;
create trigger product_inventory_updated_at before update on public.product_inventory
  for each row execute function public.set_updated_at();

create table if not exists public.inventory_reservations (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete restrict,
  quantity    integer not null check (quantity > 0),
  status      text not null default 'active' check (status in ('active', 'consumed', 'released', 'expired')),
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  settled_at  timestamptz,
  unique (order_id, product_id)
);
create index if not exists inventory_reservations_active_idx on public.inventory_reservations (expires_at) where status = 'active';
create index if not exists inventory_reservations_product_id_idx on public.inventory_reservations (product_id);

-- Append-only stock ledger (the inventory audit trail).
create table if not exists public.inventory_movements (
  id               bigint generated always as identity primary key,
  product_id       uuid not null references public.products (id) on delete restrict,
  order_id         uuid references public.orders (id) on delete set null,
  kind             text not null check (kind in (
                     'reserve', 'release', 'expire', 'sale', 'late_sale', 'quotation_sale',
                     'adjustment', 'return_to_stock', 'settings')),
  on_hand_before   integer not null,
  on_hand_after    integer not null,
  reserved_before  integer not null,
  reserved_after   integer not null,
  actor_id         uuid,
  actor_role       text not null,
  reason           text check (char_length(reason) <= 500),
  idempotency_key  text unique check (char_length(idempotency_key) <= 128),
  created_at       timestamptz not null default now()
);
create index if not exists inventory_movements_product_id_idx on public.inventory_movements (product_id, created_at);
create index if not exists inventory_movements_order_id_idx on public.inventory_movements (order_id);

alter table public.product_inventory enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.inventory_movements enable row level security;
drop policy if exists product_inventory_staff_read on public.product_inventory;
create policy product_inventory_staff_read on public.product_inventory for select to authenticated using ((select public.is_staff()));
drop policy if exists inventory_reservations_staff_read on public.inventory_reservations;
create policy inventory_reservations_staff_read on public.inventory_reservations for select to authenticated using ((select public.is_staff()));
drop policy if exists inventory_movements_staff_read on public.inventory_movements;
create policy inventory_movements_staff_read on public.inventory_movements for select to authenticated using ((select public.is_staff()));
revoke all on public.product_inventory, public.inventory_reservations, public.inventory_movements from anon;
revoke insert, update, delete, truncate on public.product_inventory, public.inventory_reservations, public.inventory_movements from authenticated;

-- Internal: apply a stock change under the row lock and write the ledger.
create or replace function public.inventory_apply(
  p_product_id uuid, p_delta_on_hand integer, p_delta_reserved integer, p_kind text,
  p_order_id uuid, p_reason text, p_idempotency_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.product_inventory%rowtype;
begin
  if p_idempotency_key is not null and exists (select 1 from public.inventory_movements where idempotency_key = p_idempotency_key) then
    return true; -- already applied
  end if;
  select * into inv from public.product_inventory where product_id = p_product_id for update;
  if not found then
    raise exception 'INVENTORY_MISSING';
  end if;
  if inv.stock_on_hand + p_delta_on_hand < 0
     or inv.stock_reserved + p_delta_reserved < 0
     or inv.stock_reserved + p_delta_reserved > inv.stock_on_hand + p_delta_on_hand then
    return false;
  end if;
  update public.product_inventory
     set stock_on_hand = stock_on_hand + p_delta_on_hand,
         stock_reserved = stock_reserved + p_delta_reserved
   where product_id = p_product_id;
  insert into public.inventory_movements (
    product_id, order_id, kind, on_hand_before, on_hand_after, reserved_before, reserved_after,
    actor_id, actor_role, reason, idempotency_key)
  values (
    p_product_id, p_order_id, p_kind, inv.stock_on_hand, inv.stock_on_hand + p_delta_on_hand,
    inv.stock_reserved, inv.stock_reserved + p_delta_reserved,
    (select auth.uid()),
    case when (select auth.role()) = 'service_role' then 'system' else coalesce(public.staff_role(), 'system') end,
    left(p_reason, 500), p_idempotency_key);
  return true;
end;
$$;

-- Releases every ACTIVE reservation of one order (payment failed, cancelled, expired).
create or replace function public.release_order_reservations(p_order_id uuid, p_kind text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.inventory_reservations%rowtype;
  v_count integer := 0;
begin
  -- Lock order: orders -> reservations -> product_inventory (sorted), everywhere.
  perform 1 from public.orders where id = p_order_id for update;
  for r in select * from public.inventory_reservations where order_id = p_order_id and status = 'active' order by product_id for update loop
    perform public.inventory_apply(r.product_id, 0, -r.quantity, p_kind, p_order_id, null, 'res:' || r.id || ':' || p_kind);
    update public.inventory_reservations set status = case when p_kind = 'expire' then 'expired' else 'released' end, settled_at = now() where id = r.id;
    v_count := v_count + 1;
  end loop;
  if v_count > 0 then
    update public.orders set inventory_state = 'released' where id = p_order_id and inventory_state = 'reserved';
  end if;
  return v_count;
end;
$$;

-- Turns an order's stock into a sale exactly once. Uses active reservations;
-- otherwise (expired/released/none) takes available stock if it exists,
-- and never oversells: a shortfall is recorded and alerted instead.
create or replace function public.commit_order_inventory(p_order_id uuid, p_source text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ord  public.orders%rowtype;
  line jsonb;
  v_product uuid;
  v_qty integer;
  v_res public.inventory_reservations%rowtype;
  v_track boolean;
  v_short text[] := '{}';
begin
  select * into ord from public.orders where id = p_order_id for update;
  -- Idempotent; a shortfall is only re-attempted by the explicit owner retry.
  if ord.inventory_state = 'committed' or (ord.inventory_state = 'shortfall' and p_source <> 'retry') then
    return ord.inventory_state;
  end if;

  for line in select * from jsonb_array_elements(ord.items) order by (value ->> 'product_id') loop
    v_product := (line ->> 'product_id')::uuid;
    v_qty := (line ->> 'quantity')::integer;
    select * into v_res from public.inventory_reservations where order_id = p_order_id and product_id = v_product for update;
    select track_inventory into v_track from public.product_inventory where product_id = v_product;

    if v_track is not true then
      -- Untracked now: a reservation made while it was tracked must not leak.
      if found and v_res.status = 'active' then
        perform public.inventory_apply(v_product, 0, -v_res.quantity, 'release', p_order_id, 'tracking disabled', 'res:' || v_res.id || ':release');
        update public.inventory_reservations set status = 'released', settled_at = now() where id = v_res.id;
      end if;
      continue;
    end if;

    if v_res.id is not null and v_res.status = 'active' then
      perform public.inventory_apply(v_product, -v_qty, -v_res.quantity, 'sale', p_order_id, null, 'sale:' || p_order_id || ':' || v_product);
      update public.inventory_reservations set status = 'consumed', settled_at = now() where id = v_res.id;
    elsif public.inventory_apply(v_product, -v_qty, 0, case when p_source = 'quotation' then 'quotation_sale' else 'late_sale' end,
                                 p_order_id, null, 'sale:' || p_order_id || ':' || v_product) then
      if v_res.id is not null then
        update public.inventory_reservations set status = 'consumed', settled_at = now() where id = v_res.id;
      end if;
    else
      v_short := v_short || (line ->> 'product_name');
    end if;
  end loop;

  if cardinality(v_short) > 0 then
    update public.orders set inventory_state = 'shortfall' where id = p_order_id;
    if p_source <> 'retry' then
      insert into public.payment_alerts (order_id, kind, message)
      values (p_order_id, 'stock_shortfall', left(format(
        'Payment for %s is confirmed but stock is not available for: %s. Nothing was oversold. Restock, then use "Retry stock" on the order, or refund the customer.',
        ord.order_number, array_to_string(v_short, ', ')), 500));
    end if;
    return 'shortfall';
  end if;
  update public.orders set inventory_state = 'committed' where id = p_order_id;
  return 'committed';
end;
$$;

-- Recovery-worker step: expire reservations whose payment window has passed.
create or replace function public.release_expired_reservations(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order uuid;
  v_done integer := 0;
begin
  for v_order in
    select distinct r.order_id
    from public.inventory_reservations r
    join public.orders o on o.id = r.order_id
    where r.status = 'active' and r.expires_at < now() and not public.is_captured_payment(o.payment_status)
    limit least(greatest(p_limit, 1), 500)
  loop
    v_done := v_done + public.release_order_reservations(v_order, 'expire');
  end loop;
  return v_done;
end;
$$;

-- Public, non-sensitive availability for the storefront (no exact counts).
create or replace function public.get_product_availability()
returns table (product_id uuid, slug text, availability text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.slug,
         case
           when i.track_inventory is not true then 'available'
           when i.stock_available <= 0 then 'out_of_stock'
           when i.stock_available <= i.low_stock_threshold then 'low_stock'
           else 'in_stock'
         end
  from public.products p
  left join public.product_inventory i on i.product_id = p.id
  where p.is_active
$$;

-- Owner: set stock (absolute, stale-safe), tracking and threshold. Audited.
create or replace function public.owner_set_stock(
  p_product_id uuid, p_expected_on_hand integer, p_new_on_hand integer,
  p_track_inventory boolean, p_low_stock_threshold integer, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.product_inventory%rowtype;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can change stock' using errcode = '42501';
  end if;
  if p_reason is null or char_length(trim(p_reason)) = 0 then
    raise exception 'A reason is required for a stock change' using errcode = '22023';
  end if;
  if p_expected_on_hand is null or p_new_on_hand is null or p_track_inventory is null or p_low_stock_threshold is null
     or p_new_on_hand < 0 or p_new_on_hand > 1000000 or p_low_stock_threshold < 0 then
    raise exception 'Invalid stock values' using errcode = '22023';
  end if;
  select * into inv from public.product_inventory where product_id = p_product_id for update;
  if not found then
    raise exception 'Unknown product' using errcode = '22023';
  end if;
  if inv.stock_on_hand <> p_expected_on_hand then
    raise exception 'STALE_OR_NOT_FOUND: stock changed since you loaded it; refresh and try again' using errcode = '40001';
  end if;
  if p_new_on_hand < inv.stock_reserved then
    raise exception 'Stock cannot go below the % unit(s) currently reserved for checkouts', inv.stock_reserved using errcode = '22023';
  end if;
  if not p_track_inventory and inv.track_inventory and inv.stock_reserved > 0 then
    raise exception 'Tracking cannot be switched off while % unit(s) are reserved by customers who are paying; try again shortly', inv.stock_reserved using errcode = '22023';
  end if;

  if p_new_on_hand <> inv.stock_on_hand then
    perform public.inventory_apply(p_product_id, p_new_on_hand - inv.stock_on_hand, 0, 'adjustment', null, trim(p_reason), null);
  end if;
  if p_track_inventory is distinct from inv.track_inventory or p_low_stock_threshold is distinct from inv.low_stock_threshold
     or not inv.quantity_confirmed then
    update public.product_inventory
       set track_inventory = p_track_inventory, low_stock_threshold = p_low_stock_threshold, quantity_confirmed = true
     where product_id = p_product_id;
    insert into public.inventory_movements (product_id, kind, on_hand_before, on_hand_after, reserved_before, reserved_after, actor_id, actor_role, reason)
    select p_product_id, 'settings', stock_on_hand, stock_on_hand, stock_reserved, stock_reserved, (select auth.uid()), 'owner',
           left(format('%s (tracking %s, low-stock %s)', trim(p_reason), track_inventory, low_stock_threshold), 500)
    from public.product_inventory where product_id = p_product_id;
  end if;
end;
$$;

-- Owner: physically returned goods go back on the shelf. Explicit, validated,
-- audited, idempotent. A refund never does this on its own.
create or replace function public.owner_return_to_stock(
  p_order_id uuid, p_product_id uuid, p_quantity integer, p_reason text, p_idempotency_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ord public.orders%rowtype;
  v_sold integer;
  v_returned integer;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can return items to stock' using errcode = '42501';
  end if;
  if p_reason is null or char_length(trim(p_reason)) = 0 then
    raise exception 'A reason is required' using errcode = '22023';
  end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9-]{16,64}$' then
    raise exception 'An idempotency key is required' using errcode = '22023';
  end if;
  if exists (select 1 from public.inventory_movements where idempotency_key = 'return:' || p_idempotency_key) then
    return;
  end if;
  select * into ord from public.orders where id = p_order_id for update;
  if not found or ord.inventory_state not in ('committed', 'shortfall') then
    raise exception 'Only items from an order whose stock was taken can be returned' using errcode = '22023';
  end if;
  select coalesce(sum(on_hand_before - on_hand_after), 0) into v_sold
    from public.inventory_movements
   where order_id = p_order_id and product_id = p_product_id and kind in ('sale', 'late_sale', 'quotation_sale');
  select coalesce(sum(on_hand_after - on_hand_before), 0) into v_returned
    from public.inventory_movements
   where order_id = p_order_id and product_id = p_product_id and kind = 'return_to_stock';
  if p_quantity is null or p_quantity < 1 or p_quantity > v_sold - v_returned then
    raise exception 'Return quantity must be between 1 and % for this product', greatest(v_sold - v_returned, 0) using errcode = '22023';
  end if;
  perform public.inventory_apply(p_product_id, p_quantity, 0, 'return_to_stock', p_order_id, trim(p_reason), 'return:' || p_idempotency_key);
end;
$$;

-- Checkout v2: prices on the server AND atomically reserves stock for card
-- orders. The conditional UPDATE in inventory_apply serialises on the product
-- row, so two buyers can never both reserve the last unit.
-- Card orders: at most 50 units per order (larger/B2B orders use a quotation)
-- and at most 3 unpaid card checkouts holding stock per client, so nobody can
-- lock the catalogue or probe exact stock levels at scale.
drop function if exists public.create_checkout_order_v2(jsonb, jsonb, text, text);
create or replace function public.create_checkout_order_v2(
  p_customer jsonb, p_items jsonb, p_order_type text, p_checkout_key text, p_client_key text default null)
returns table (order_id uuid, order_number text, public_token text, total_amount numeric, total_minor bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_product public.products%rowtype;
  v_inv public.product_inventory%rowtype;
  v_qty integer;
  v_units integer := 0;
  v_total numeric(10, 3) := 0;
  v_snapshots jsonb := '[]'::jsonb;
  v_order public.orders%rowtype;
  v_reserved boolean := false;
begin
  if p_order_type not in ('online', 'quotation') then
    raise exception 'INVALID_ORDER_TYPE';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'INVALID_ITEMS';
  end if;
  if p_checkout_key is not null and exists (select 1 from public.orders o where o.checkout_key = p_checkout_key) then
    raise exception 'DUPLICATE_CHECKOUT';
  end if;
  if p_order_type = 'online' and p_client_key is not null and (
       select count(*) from public.orders o
        where o.client_key = p_client_key and o.inventory_state = 'reserved'
          and not public.is_captured_payment(o.payment_status)) >= 3 then
    raise exception 'TOO_MANY_OPEN_CHECKOUTS';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) order by value ->> 'slug' loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 1000 then
      raise exception 'INVALID_QUANTITY';
    end if;
    v_units := v_units + v_qty;
    select * into v_product from public.products p where p.slug = v_item ->> 'slug' and p.is_active;
    if not found then
      raise exception 'PRODUCT_NOT_FOUND:%', v_item ->> 'slug';
    end if;
    v_total := v_total + v_product.price * v_qty;
    v_snapshots := v_snapshots || jsonb_build_object(
      'product_id', v_product.id, 'product_name', v_product.name, 'product_slug', v_product.slug,
      'make', v_product.make, 'weight', v_product.weight, 'quantity', v_qty,
      'unit_price', v_product.price, 'total_price', v_product.price * v_qty, 'currency', v_product.currency);
  end loop;
  if p_order_type = 'online' and v_units > 50 then
    raise exception 'CARD_QUANTITY_LIMIT';
  end if;

  insert into public.orders (
    order_type, customer_name, email, phone, address, company_name, notes,
    total_amount, total_minor, currency, status, payment_status, payment_provider, items, checkout_key, client_key
  ) values (
    p_order_type, p_customer ->> 'full_name', lower(p_customer ->> 'email'), p_customer ->> 'phone',
    p_customer ->> 'address', nullif(p_customer ->> 'company_name', ''), nullif(p_customer ->> 'notes', ''),
    v_total, (v_total * 1000)::bigint, 'OMR',
    case when p_order_type = 'online' then 'pending_payment' else 'manual_inquiry' end,
    case when p_order_type = 'online' then 'initiated' else 'unpaid' end,
    case when p_order_type = 'online' then 'paymob' else 'manual' end,
    v_snapshots, p_checkout_key, left(p_client_key, 128)
  ) returning * into v_order;

  insert into public.order_items (order_id, product_id, product_name, product_slug, make, weight, quantity, unit_price, total_price, unit_cost, currency)
  select v_order.id, (s ->> 'product_id')::uuid, s ->> 'product_name', s ->> 'product_slug', s ->> 'make', s ->> 'weight',
         (s ->> 'quantity')::integer, (s ->> 'unit_price')::numeric, (s ->> 'total_price')::numeric, pc.unit_cost, s ->> 'currency'
  from jsonb_array_elements(v_snapshots) s
  left join public.product_costs pc on pc.product_id = (s ->> 'product_id')::uuid;

  if p_order_type = 'online' then
    for v_item in select * from jsonb_array_elements(v_snapshots) order by value ->> 'product_id' loop
      select * into v_inv from public.product_inventory where product_id = (v_item ->> 'product_id')::uuid;
      if v_inv.track_inventory is not true then
        continue;
      end if;
      if not public.inventory_apply((v_item ->> 'product_id')::uuid, 0, (v_item ->> 'quantity')::integer, 'reserve',
                                    v_order.id, null, 'reserve:' || v_order.id || ':' || (v_item ->> 'product_id')) then
        raise exception 'OUT_OF_STOCK:%', v_item ->> 'product_slug';
      end if;
      insert into public.inventory_reservations (order_id, product_id, quantity, expires_at)
      values (v_order.id, (v_item ->> 'product_id')::uuid, (v_item ->> 'quantity')::integer, now() + interval '35 minutes');
      v_reserved := true;
    end loop;
    if v_reserved then
      update public.orders set inventory_state = 'reserved' where id = v_order.id;
    end if;
  end if;

  return query select v_order.id, v_order.order_number, v_order.public_token, v_order.total_amount, v_order.total_minor;
end;
$$;

-- Backward compatible: the Phase 1 entry point now reserves stock too.
create or replace function public.create_checkout_order(p_customer jsonb, p_items jsonb, p_order_type text)
returns table (order_id uuid, order_number text, public_token text, total_amount numeric, total_minor bigint)
language sql
security definer
set search_path = ''
as $$
  select * from public.create_checkout_order_v2(p_customer, p_items, p_order_type, null, null)
$$;

-- ===========================================================================
-- 2. Refund / void reconciliation (verified against Paymob, never trusted raw)
-- ===========================================================================

-- A refund, partial refund or void is money going back: its own fact, linked
-- to the original payment, which is never rewritten.
create table if not exists public.payment_refunds (
  id                        uuid primary key default gen_random_uuid(),
  payment_id                uuid not null references public.payments (id) on delete restrict,
  order_id                  uuid not null references public.orders (id) on delete restrict,
  kind                      text not null check (kind in ('refund', 'void')),
  amount_minor              bigint not null check (amount_minor > 0),
  currency                  text not null,
  parent_transaction_id     text not null,
  source_transaction_id     text,
  cumulative_refunded_minor bigint not null,
  idempotency_key           text not null unique,
  verified_via              text not null default 'paymob_inquiry',
  created_at                timestamptz not null default now()
);
create index if not exists payment_refunds_order_id_idx on public.payment_refunds (order_id);
create index if not exists payment_refunds_payment_id_idx on public.payment_refunds (payment_id);

create table if not exists public.refund_verifications (
  id              uuid primary key default gen_random_uuid(),
  callback_id     uuid not null unique references public.paymob_callbacks (id) on delete cascade,
  transaction_id  text not null,
  status          text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  outcome         text,
  attempts        integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_until    timestamptz,
  last_error      text,
  created_at      timestamptz not null default now(),
  finished_at     timestamptz
);
create index if not exists refund_verifications_due_idx on public.refund_verifications (next_attempt_at) where status in ('pending', 'processing');

alter table public.payment_refunds enable row level security;
alter table public.refund_verifications enable row level security;
drop policy if exists payment_refunds_staff_read on public.payment_refunds;
create policy payment_refunds_staff_read on public.payment_refunds for select to authenticated using ((select public.is_staff()));
drop policy if exists refund_verifications_owner_read on public.refund_verifications;
create policy refund_verifications_owner_read on public.refund_verifications for select to authenticated using ((select public.is_owner()));
revoke all on public.payment_refunds, public.refund_verifications from anon;
revoke insert, update, delete, truncate on public.payment_refunds, public.refund_verifications from authenticated;

alter table public.payment_alerts drop constraint if exists payment_alerts_kind_check;
alter table public.payment_alerts add constraint payment_alerts_kind_check check (kind in (
  'paid_after_cancel', 'duplicate_charge', 'amount_mismatch', 'refund_or_void',
  'unknown_payment', 'reference_mismatch', 'integration_mismatch', 'authorization_only',
  'stock_shortfall', 'refund_recorded', 'refund_unmatched', 'refund_inconsistent', 'refund_verification_failed'));

-- Callbacks that mention money going back get a unique key per distinct
-- payload, so successive partial refunds are not collapsed as duplicates.
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
  v_parent_flag text := lower(coalesce(p_payload -> 'obj' ->> 'has_parent_transaction', 'false'));
  v_money_back boolean := coalesce(p_is_refunded, false) or coalesce(p_is_voided, false) or v_parent_flag = 'true';
begin
  if p_transaction_id is null or p_transaction_id !~ '^[0-9]{1,32}$' then
    raise exception 'INVALID_TRANSACTION_ID';
  end if;
  v_key := p_transaction_id || ':' || p_success || ':' || p_pending || ':' || coalesce(p_is_refunded, false) || ':' || coalesce(p_is_voided, false);
  if v_money_back then
    v_key := v_key || ':' || md5(p_payload::text);
  end if;

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

-- Applies Paymob's authoritative view of the ORIGINAL (parent) transaction,
-- fetched by our server with our credentials. Cumulative and idempotent: the
-- same refunded total never counts twice, whichever callback triggered it.
create or replace function public.apply_refund_reconciliation(p_verification_id uuid, p_parent jsonb, p_source_transaction_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  job public.refund_verifications%rowtype;
  pay public.payments%rowtype;
  ord public.orders%rowtype;
  v_parent_id text := p_parent ->> 'id';
  v_voided boolean := coalesce((p_parent ->> 'is_voided')::boolean, false);
  v_target bigint;
  v_current bigint;
  v_delta bigint;
  v_outcome text;
  v_refunded bigint;
  v_captured bigint;
begin
  select * into job from public.refund_verifications where id = p_verification_id for update;
  if not found then
    raise exception 'UNKNOWN_VERIFICATION';
  end if;
  if job.status = 'done' then
    return job.outcome;
  end if;

  select * into pay from public.payments where provider_transaction_id = v_parent_id for update;
  if not found then
    -- The payment may not be applied yet (refund reported first): find the
    -- attempt through Paymob's order id from the verified inquiry and wait,
    -- but never forever.
    select * into pay from public.payments where provider_order_id = coalesce(p_parent ->> 'order_id', p_parent -> 'order' ->> 'id') for update;
    if found and pay.provider_transaction_id is null and pay.status in ('initiated', 'pending') and job.attempts < 8 then
      update public.refund_verifications
         set status = 'pending', next_attempt_at = now() + make_interval(mins => least(power(2, job.attempts)::integer, 240)),
             locked_until = null, last_error = 'awaiting parent payment'
       where id = job.id;
      return 'awaiting_parent';
    end if;
    pay := null;
    v_outcome := 'refund_unmatched';
  else
    select * into ord from public.orders where id = pay.order_id for update;
    v_target := case when v_voided then pay.amount_minor
                     else coalesce(nullif(p_parent ->> 'refunded_amount_cents', '')::bigint, 0) end;
    select coalesce(sum(amount_minor), 0) into v_current from public.payment_refunds where payment_id = pay.id;
    v_delta := v_target - v_current;

    if v_target > pay.amount_minor then
      v_outcome := 'refund_inconsistent';
    elsif v_delta <= 0 then
      -- Same or older cumulative figure (a stale report): nothing new.
      v_outcome := 'refund_already_recorded';
    else
      insert into public.payment_refunds (
        payment_id, order_id, kind, amount_minor, currency, parent_transaction_id, source_transaction_id,
        cumulative_refunded_minor, idempotency_key)
      values (pay.id, ord.id, case when v_voided then 'void' else 'refund' end, v_delta, ord.currency, v_parent_id,
              p_source_transaction_id, v_target, v_parent_id || ':' || case when v_voided then 'void' else 'refund' end || ':' || v_target)
      on conflict (idempotency_key) do nothing;

      -- Order payment state from the money actually captured and returned.
      select coalesce(sum(amount_minor), 0) into v_refunded from public.payment_refunds where order_id = ord.id;
      select coalesce(sum(amount_minor), 0) into v_captured from public.payments where order_id = ord.id and status = 'successful';
      update public.orders
         set refunded_minor = v_refunded,
             payment_status = case
               when v_voided and v_captured - v_refunded <= 0 then 'voided'
               when v_captured - v_refunded <= 0 then 'refunded'
               when v_captured - v_refunded < total_minor then 'partially_refunded'
               else payment_status end
       where id = ord.id;

      insert into public.notification_outbox (order_id, event_type, recipient, idempotency_key, payload)
      values (ord.id, 'refund_recorded_staff', 'staff', 'refund_recorded_staff:' || v_parent_id || ':' || v_target,
              jsonb_build_object('order_number', ord.order_number, 'refunded_minor', v_delta, 'cumulative_minor', v_target, 'kind', case when v_voided then 'void' else 'refund' end))
      on conflict (idempotency_key) do nothing;
      v_outcome := case when v_voided then 'void_recorded' else 'refund_recorded' end;
    end if;
  end if;

  if v_outcome in ('refund_unmatched', 'refund_inconsistent') then
    insert into public.payment_alerts (order_id, callback_id, kind, message)
    values (ord.id, job.callback_id, v_outcome, left(format(
      'Paymob reports refunded %s (voided %s) on transaction %s, which could not be applied (%s). Check Paymob before any further action.',
      coalesce(p_parent ->> 'refunded_amount_cents', '?'), v_voided, coalesce(v_parent_id, '?'), v_outcome), 500));
  end if;

  update public.refund_verifications
     set status = 'done', outcome = v_outcome, finished_at = now(), locked_until = null, last_error = null
   where id = job.id;
  return v_outcome;
end;
$$;

create or replace function public.claim_refund_verifications(p_limit integer default 3)
returns setof public.refund_verifications
language sql
security definer
set search_path = ''
as $$
  update public.refund_verifications v
     set status = 'processing', attempts = attempts + 1, locked_until = now() + interval '5 minutes'
   where v.id in (
     select id from public.refund_verifications
     where (status = 'pending' or (status = 'processing' and locked_until < now()))
       and next_attempt_at <= now()
     order by next_attempt_at
     limit least(greatest(p_limit, 1), 10)
     for update skip locked)
  returning v.*
$$;

create or replace function public.fail_refund_verification(p_verification_id uuid, p_error text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  job public.refund_verifications%rowtype;
begin
  select * into job from public.refund_verifications where id = p_verification_id for update;
  if not found or job.status = 'done' then
    return;
  end if;
  if job.attempts >= 8 then
    update public.refund_verifications set status = 'failed', last_error = left(p_error, 500), finished_at = now(), locked_until = null where id = job.id;
    insert into public.payment_alerts (callback_id, kind, message)
    values (job.callback_id, 'refund_verification_failed',
            left(format('Could not verify a refund/void report for Paymob transaction %s after %s attempts. Check Paymob.', job.transaction_id, job.attempts), 500));
  else
    update public.refund_verifications
       set status = 'pending', last_error = left(p_error, 500), locked_until = null,
           next_attempt_at = now() + make_interval(mins => least(power(2, job.attempts)::integer, 240))
     where id = job.id;
  end if;
end;
$$;

-- ===========================================================================
-- 3. Notification outbox
-- ===========================================================================

create table if not exists public.notification_outbox (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid references public.orders (id) on delete set null,
  event_type          text not null check (event_type in (
                        'order_paid_customer', 'order_paid_staff', 'refund_recorded_staff', 'payment_alert_staff')),
  -- 'staff' is resolved to ORDER_NOTIFICATION_EMAIL by the sender, never stored here.
  recipient           text not null check (char_length(recipient) <= 254),
  idempotency_key     text not null unique,
  payload             jsonb not null default '{}'::jsonb,
  status              text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts            integer not null default 0,
  next_attempt_at     timestamptz not null default now(),
  locked_until        timestamptz,
  sent_at             timestamptz,
  provider_message_id text,
  last_error          text,
  created_at          timestamptz not null default now()
);
create index if not exists notification_outbox_due_idx on public.notification_outbox (next_attempt_at) where status in ('pending', 'sending');
create index if not exists notification_outbox_order_id_idx on public.notification_outbox (order_id);

alter table public.notification_outbox enable row level security;
drop policy if exists notification_outbox_owner_read on public.notification_outbox;
create policy notification_outbox_owner_read on public.notification_outbox for select to authenticated using ((select public.is_owner()));
revoke all on public.notification_outbox from anon;
revoke insert, update, delete, truncate on public.notification_outbox from authenticated;

-- Messages older than 7 days are expired instead of sent (e.g. queued while the
-- provider was disabled), so enabling email never flushes stale confirmations.
create or replace function public.claim_notifications(p_limit integer default 10)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notification_outbox
     set status = 'failed', last_error = 'expired: older than 7 days when a sender became available', locked_until = null
   where status in ('pending', 'sending') and created_at < now() - interval '7 days';

  return query
  update public.notification_outbox n
     set status = 'sending', attempts = attempts + 1, locked_until = now() + interval '5 minutes'
   where n.id in (
     select id from public.notification_outbox
     where (status = 'pending' or (status = 'sending' and locked_until < now()))
       and next_attempt_at <= now()
     order by next_attempt_at
     limit least(greatest(p_limit, 1), 50)
     for update skip locked)
  returning n.*;
end;
$$;

create or replace function public.complete_notification(p_id uuid, p_provider_message_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notification_outbox
     set status = 'sent', sent_at = now(), provider_message_id = left(p_provider_message_id, 200), locked_until = null, last_error = null
   where id = p_id and status = 'sending'
$$;

create or replace function public.fail_notification(p_id uuid, p_error text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notification_outbox
     set status = case when attempts >= 8 then 'failed' else 'pending' end,
         last_error = left(p_error, 500),
         locked_until = null,
         next_attempt_at = now() + make_interval(mins => least(power(2, attempts)::integer, 240))
   where id = p_id and status = 'sending'
$$;

-- ===========================================================================
-- 4. Callback processing (Phase 1 logic + inventory, refunds, notifications)
-- ===========================================================================

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
  v_money_back boolean;
begin
  select * into cb from public.paymob_callbacks where id = p_callback_id for update;
  if not found then
    raise exception 'UNKNOWN_CALLBACK';
  end if;
  if cb.status = 'processed' then
    return cb.outcome;
  end if;

  update public.paymob_callbacks set attempts = attempts + 1 where id = cb.id;
  v_money_back := cb.is_refunded or cb.is_voided or coalesce((cb.payload -> 'obj' ->> 'has_parent_transaction')::boolean, false);

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

    if v_money_back then
      -- Verified asynchronously against Paymob before any money state changes.
      v_outcome := 'refund_verification_queued';
    elsif cb.is_auth and not cb.is_capture then
      v_outcome := 'authorization_only';
    elsif cb.pending then
      v_outcome := case when ord.payment_status in ('initiated', 'failed') then 'pending' else 'ignored_stale_pending' end;
    elsif cb.success then
      if public.is_captured_payment(ord.payment_status) then
        v_outcome := case when ord.paymob_transaction_id = cb.transaction_id then 'already_paid' else 'duplicate_charge' end;
      elsif cb.amount_minor is distinct from ord.total_minor or upper(cb.currency) is distinct from ord.currency
            or cb.amount_minor is distinct from pay.amount_minor then
        v_outcome := 'amount_mismatch';
      else
        v_outcome := 'paid';
      end if;
    else
      if public.is_captured_payment(ord.payment_status) or pay.status = 'successful' then
        v_outcome := 'ignored_after_paid';
      elsif exists (select 1 from public.payments p2 where p2.order_id = pay.order_id and p2.id <> pay.id and p2.created_at > pay.created_at) then
        v_outcome := 'failed_superseded';
      else
        v_outcome := 'failed';
      end if;
    end if;
  end if;

  if v_money_back and v_outcome in ('unknown_payment', 'reference_mismatch', 'integration_mismatch') then
    v_outcome := 'refund_verification_queued';
  end if;

  if v_outcome = 'paid' then
    update public.payments set status = 'successful', provider_transaction_id = cb.transaction_id where id = pay.id;
    update public.orders
       set payment_status = 'successful',
           paid_at = now(),
           paymob_transaction_id = cb.transaction_id,
           paymob_order_id = pay.provider_order_id,
           status = case when status in ('pending_payment', 'failed') then 'paid' else status end
     where id = ord.id;
    perform public.commit_order_inventory(ord.id, 'card');
    if ord.status = 'cancelled' then
      v_alert := 'paid_after_cancel';
      v_message := format('Card payment %s arrived after %s was cancelled. Reinstate the order or refund the customer.', cb.transaction_id, ord.order_number);
    end if;
    insert into public.notification_outbox (order_id, event_type, recipient, idempotency_key, payload)
    values
      (ord.id, 'order_paid_customer', ord.email, 'order_paid_customer:' || ord.id,
       jsonb_build_object('order_number', ord.order_number, 'customer_name', ord.customer_name, 'total_amount', ord.total_amount, 'currency', ord.currency, 'items', ord.items)),
      (ord.id, 'order_paid_staff', 'staff', 'order_paid_staff:' || ord.id,
       jsonb_build_object('order_number', ord.order_number, 'total_amount', ord.total_amount, 'currency', ord.currency, 'items', ord.items))
    on conflict (idempotency_key) do nothing;
  elsif v_outcome = 'pending' then
    update public.payments set status = 'pending' where id = pay.id and status in ('initiated', 'pending');
    update public.orders set payment_status = 'pending' where id = ord.id;
  elsif v_outcome = 'failed' then
    update public.payments set status = 'failed' where id = pay.id and status in ('initiated', 'pending');
    update public.orders
       set payment_status = 'failed',
           status = case when status = 'pending_payment' then 'failed' else status end
     where id = ord.id;
    perform public.release_order_reservations(ord.id, 'release');
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
    if pay.provider_transaction_id is null then
      update public.payments set status = 'successful', provider_transaction_id = cb.transaction_id where id = pay.id;
    else
      insert into public.payments (order_id, special_reference, amount_minor, currency, provider_transaction_id, status, integration_ids, environment)
      values (ord.id, left(pay.special_reference || '-dup-' || cb.transaction_id, 128), coalesce(cb.amount_minor, pay.amount_minor),
              coalesce(upper(cb.currency), pay.currency), cb.transaction_id, 'successful', pay.integration_ids, pay.environment)
      on conflict do nothing;
    end if;
    v_alert := 'duplicate_charge';
    v_message := format('A second card payment %s was captured for %s, which was already paid by %s. Refund one of them.',
                        cb.transaction_id, ord.order_number, ord.paymob_transaction_id);
  elsif v_outcome = 'refund_verification_queued' then
    insert into public.refund_verifications (callback_id, transaction_id) values (cb.id, cb.transaction_id)
    on conflict (callback_id) do nothing;
  elsif v_outcome = 'authorization_only' then
    v_alert := 'authorization_only';
    v_message := format('Paymob reported an authorisation without capture (transaction %s) for %s. The order is not paid.', cb.transaction_id, ord.order_number);
  elsif v_outcome in ('unknown_payment', 'reference_mismatch', 'integration_mismatch') and cb.success and not cb.pending then
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

-- ===========================================================================
-- 5. Status rules: settled payment states, stock on cancel / quotation sale
-- ===========================================================================

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
      if new.status = 'paid' and not (old.payment_provider = 'paymob' and public.is_payment_confirmed(old.payment_status)) then
        raise exception 'Only a card order with a confirmed Paymob payment can be reinstated as paid' using errcode = '42501';
      end if;
      if new.status = 'placement' and old.order_type <> 'quotation' then
        raise exception 'Only quotation orders can be reinstated to placement' using errcode = '42501';
      end if;
    end if;

    v_paid := public.is_payment_confirmed(new.payment_status);
    if new.status in ('processing', 'shipping', 'delivered', 'completed') and not v_paid then
      raise exception 'Payment must be confirmed before an order can be fulfilled' using errcode = '42501';
    end if;
    if new.status in ('processing', 'shipping', 'delivered', 'completed') and new.inventory_state = 'shortfall' then
      raise exception 'This order has a stock shortfall; restock before fulfilling it' using errcode = '42501';
    end if;
    if new.status = 'cancelled' then
      if v_reason is null then
        raise exception 'A reason is required to cancel an order' using errcode = '22023';
      end if;
      if public.is_captured_payment(new.payment_status) or new.payment_status = 'verified' then
        if not v_owner then
          raise exception 'Only the owner can cancel an order that has been paid' using errcode = '42501';
        end if;
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- Stock side effects of status changes (all write paths).
create or replace function public.order_status_inventory_effects()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Cancelling an unpaid order frees its reservation. A paid, committed order
  -- is never restocked automatically: returns are an explicit owner action.
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    perform public.release_order_reservations(new.id, 'release');
  end if;
  -- Quotations take stock when fulfilment starts (payment already confirmed).
  if new.order_type = 'quotation' and new.status = 'processing' and old.status is distinct from 'processing'
     and new.inventory_state = 'none' then
    if public.commit_order_inventory(new.id, 'quotation') = 'shortfall' then
      raise exception 'Not enough stock to fulfil this quotation; update stock first' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists orders_status_inventory on public.orders;
create trigger orders_status_inventory after update of status on public.orders
  for each row when (old.status is distinct from new.status)
  execute function public.order_status_inventory_effects();

-- ===========================================================================
-- 6. Reporting: gross / refunds / net from separate facts
-- ===========================================================================

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
    select o.* from public.orders o
    where (public.is_captured_payment(o.payment_status) or o.payment_status = 'verified')
      and coalesce(o.paid_at, o.created_at) >= p_from
      and coalesce(o.paid_at, o.created_at) < p_to
  ),
  refunds as (
    select r.* from public.payment_refunds r join collected c on c.id = r.order_id
  ),
  captured as (
    select c.id,
           case when c.order_type = 'quotation' then c.total_minor
                else coalesce((select sum(p.amount_minor) from public.payments p where p.order_id = c.id and p.status = 'successful'), c.total_minor) end as captured_minor
    from collected c
  ),
  kept as (
    select * from collected where payment_status in ('successful', 'partially_refunded', 'verified')
  ),
  lines as (
    select i.* from public.order_items i join kept k on k.id = i.order_id
  )
  select jsonb_build_object(
    'gross',            coalesce((select sum(captured_minor) from captured), 0) / 1000.0,
    'refunds',          coalesce((select sum(amount_minor) from refunds), 0) / 1000.0,
    'revenue',          (coalesce((select sum(captured_minor) from captured), 0) - coalesce((select sum(amount_minor) from refunds), 0)) / 1000.0,
    'orders',           (select count(*) from collected),
    'refunded_orders',  (select count(distinct order_id) from refunds),
    'cancelled_paid',   (select count(*) from kept where status = 'cancelled'),
    'cancelled_paid_amount', coalesce((select sum(total_amount) from kept where status = 'cancelled'), 0),
    'units',            coalesce((select sum(quantity) from lines), 0),
    'cost',             coalesce((select sum(unit_cost * quantity) from lines where unit_cost is not null), 0),
    'costed_revenue',   coalesce((select sum(total_price) from lines where unit_cost is not null), 0),
    'uncosted_revenue', coalesce((select sum(total_price) from lines where unit_cost is null), 0),
    'online_revenue',   coalesce((select sum(total_amount) from collected where order_type = 'online'), 0),
    'manual_revenue',   coalesce((select sum(total_amount) from collected where order_type = 'quotation'), 0),
    'pending_payment',  (select count(*) from public.orders where status = 'pending_payment' and created_at >= p_from and created_at < p_to),
    'failed_payment',   (select count(*) from public.orders where payment_status = 'failed' and created_at >= p_from and created_at < p_to),
    'by_month', coalesce((
      select jsonb_agg(m order by m ->> 'month') from (
        select jsonb_build_object(
          'month', to_char(date_trunc('month', coalesce(paid_at, created_at) at time zone 'Asia/Muscat'), 'YYYY-MM'),
          'revenue', sum(total_amount), 'orders', count(*)) m
        from collected
        group by date_trunc('month', coalesce(paid_at, created_at) at time zone 'Asia/Muscat')
      ) x), '[]'::jsonb),
    'by_product', coalesce((
      select jsonb_agg(p order by (p ->> 'revenue')::numeric desc) from (
        select jsonb_build_object('product_name', product_name, 'units', sum(quantity), 'revenue', sum(total_price),
          'cost', sum(unit_cost * quantity), 'has_cost', bool_and(unit_cost is not null)) p
        from lines group by product_name
      ) y), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

-- Releases ONE expired, unpaid order per call (one transaction per order).
-- SKIP LOCKED means it never waits on an order another transaction holds, so
-- it cannot deadlock with payment commits or cancellations.
create or replace function public.release_next_expired_order()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order uuid;
begin
  select o.id into v_order
    from public.orders o
   where exists (select 1 from public.inventory_reservations r
                  where r.order_id = o.id and r.status = 'active' and r.expires_at < now())
     and not public.is_captured_payment(o.payment_status)
   order by o.created_at
   limit 1
   for update of o skip locked;
  if v_order is null then
    return 0;
  end if;
  return public.release_order_reservations(v_order, 'expire');
end;
$$;

-- Owner: after restocking, retry taking stock for a paid order in shortfall.
-- Lines already taken are skipped (per-line idempotency keys).
create or replace function public.owner_retry_stock_commit(p_order_id uuid, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ord public.orders%rowtype;
  v_result text;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can retry stock for an order' using errcode = '42501';
  end if;
  if p_reason is null or char_length(trim(p_reason)) = 0 then
    raise exception 'A reason is required' using errcode = '22023';
  end if;
  select * into ord from public.orders where id = p_order_id for update;
  if not found or ord.inventory_state <> 'shortfall' then
    raise exception 'This order has no stock shortfall' using errcode = '22023';
  end if;
  v_result := public.commit_order_inventory(p_order_id, 'retry');
  if v_result = 'shortfall' then
    raise exception 'Still not enough stock for this order; update stock first' using errcode = '22023';
  end if;
  perform set_config('sams.status_reason', left(trim(p_reason), 500), true);
  return v_result;
end;
$$;

-- Every payment alert also queues a staff email (idempotent per alert).
create or replace function public.enqueue_payment_alert_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_outbox (order_id, event_type, recipient, idempotency_key, payload)
  values (new.order_id, 'payment_alert_staff', 'staff', 'payment_alert_staff:' || new.id,
          jsonb_build_object('kind', new.kind, 'message', new.message,
                             'order_number', (select order_number from public.orders where id = new.order_id)))
  on conflict (idempotency_key) do nothing;
  return new;
end;
$$;

drop trigger if exists payment_alerts_email on public.payment_alerts;
create trigger payment_alerts_email after insert on public.payment_alerts
  for each row execute function public.enqueue_payment_alert_email();

-- ===========================================================================
-- 7. Privileges
-- ===========================================================================

revoke execute on function public.inventory_apply(uuid, integer, integer, text, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.release_order_reservations(uuid, text) from public, anon, authenticated;
revoke execute on function public.commit_order_inventory(uuid, text) from public, anon, authenticated;
revoke execute on function public.release_expired_reservations(integer) from public, anon, authenticated;
revoke execute on function public.create_checkout_order(jsonb, jsonb, text) from public, anon, authenticated;
revoke execute on function public.apply_refund_reconciliation(uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.claim_refund_verifications(integer) from public, anon, authenticated;
revoke execute on function public.fail_refund_verification(uuid, text) from public, anon, authenticated;
revoke execute on function public.claim_notifications(integer) from public, anon, authenticated;
revoke execute on function public.complete_notification(uuid, text) from public, anon, authenticated;
revoke execute on function public.fail_notification(uuid, text) from public, anon, authenticated;
revoke execute on function public.ensure_product_inventory() from public, anon, authenticated;
revoke execute on function public.order_status_inventory_effects() from public, anon, authenticated;
revoke execute on function public.record_paymob_callback(text, text, text, integer, bigint, text, boolean, boolean, boolean, boolean, boolean, boolean, jsonb) from public, anon, authenticated;
revoke execute on function public.process_paymob_callback(uuid) from public, anon, authenticated;

grant execute on function public.release_expired_reservations(integer) to service_role;
grant execute on function public.release_order_reservations(uuid, text) to service_role;
grant execute on function public.create_checkout_order(jsonb, jsonb, text) to service_role;
grant execute on function public.apply_refund_reconciliation(uuid, jsonb, text) to service_role;
grant execute on function public.claim_refund_verifications(integer) to service_role;
grant execute on function public.fail_refund_verification(uuid, text) to service_role;
grant execute on function public.claim_notifications(integer) to service_role;
grant execute on function public.complete_notification(uuid, text) to service_role;
grant execute on function public.fail_notification(uuid, text) to service_role;
grant execute on function public.record_paymob_callback(text, text, text, integer, bigint, text, boolean, boolean, boolean, boolean, boolean, boolean, jsonb) to service_role;
grant execute on function public.process_paymob_callback(uuid) to service_role;

revoke execute on function public.owner_set_stock(uuid, integer, integer, boolean, integer, text) from public, anon;
revoke execute on function public.owner_return_to_stock(uuid, uuid, integer, text, text) from public, anon;
grant execute on function public.owner_set_stock(uuid, integer, integer, boolean, integer, text) to authenticated;
grant execute on function public.owner_return_to_stock(uuid, uuid, integer, text, text) to authenticated;

revoke execute on function public.release_next_expired_order() from public, anon, authenticated;
grant execute on function public.release_next_expired_order() to service_role;
revoke execute on function public.enqueue_payment_alert_email() from public, anon, authenticated;
revoke execute on function public.owner_retry_stock_commit(uuid, text) from public, anon;
grant execute on function public.owner_retry_stock_commit(uuid, text) to authenticated;
revoke execute on function public.create_checkout_order_v2(jsonb, jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.create_checkout_order_v2(jsonb, jsonb, text, text, text) to service_role;
revoke execute on function public.is_captured_payment(text), public.is_payment_confirmed(text) from public, anon;
grant execute on function public.is_captured_payment(text), public.is_payment_confirmed(text) to authenticated, service_role;
revoke execute on function public.get_product_availability() from public;
grant execute on function public.get_product_availability() to anon, authenticated;
