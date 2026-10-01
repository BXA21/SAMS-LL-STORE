-- SAMS LLC store: core schema, row level security and payment state machine.
--
-- Access model
--   anon           reads the active public catalog (products, categories, faqs,
--                  testimonials, certificates, site_settings). Nothing else.
--   authenticated  gets data only through an active row in staff_profiles:
--                    owner  everything, including costs, payments and reports
--                    sales  orders, quotations and CRM contacts, never costs
--   service_role   used only by Next.js route handlers on the server. Every
--                  customer write (checkout, quotation, contact form) goes
--                  through those handlers and the SECURITY DEFINER functions
--                  below; there is no public INSERT policy on any table.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------

create table public.staff_profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null check (char_length(full_name) between 1 and 120),
  role       text not null check (role in ('owner', 'sales')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.staff_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select sp.role
  from public.staff_profiles sp
  where sp.user_id = (select auth.uid()) and sp.is_active
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.staff_role() is not null
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.staff_role() = 'owner', false)
$$;

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  image_url   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.products (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 1 and 200),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  make              text not null,
  category_id       uuid references public.categories (id) on delete set null,
  product_type      text not null,
  short_description text,
  overview          text,
  price             numeric(10, 3) not null check (price > 0),
  currency          text not null default 'OMR' check (currency = 'OMR'),
  weight            text not null,
  life_years        integer not null default 5 check (life_years between 0 and 50),
  quantity          integer not null default 1 check (quantity > 0),
  stock             integer not null default 100 check (stock >= 0),
  images            text[] not null default '{}',
  key_features      text[] not null default '{}',
  specifications    jsonb not null default '{}',
  best_for          text[] not null default '{}',
  safety_notes      text[] not null default '{}',
  usage_areas       text[] not null default '{}',
  is_featured       boolean not null default false,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index products_category_id_idx on public.products (category_id);

-- Purchase cost per unit, kept out of the products table so the public catalog
-- query can never expose margins. Owner only.
create table public.product_costs (
  product_id uuid primary key references public.products (id) on delete cascade,
  unit_cost  numeric(10, 3) not null check (unit_cost >= 0),
  updated_at timestamptz not null default now()
);

create table public.product_price_history (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  old_price  numeric(10, 3) not null,
  new_price  numeric(10, 3) not null,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index product_price_history_product_id_idx on public.product_price_history (product_id);

create or replace function public.log_price_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.price is distinct from old.price then
    insert into public.product_price_history (product_id, old_price, new_price, changed_by)
    values (new.id, old.price, new.price, (select auth.uid()));
  end if;
  return new;
end;
$$;

create table public.certificates (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  image_url        text,
  file_url         text,
  certificate_type text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.testimonials (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  position   text,
  company    text,
  message    text not null,
  rating     integer not null default 5 check (rating between 1 and 5),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.faqs (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text not null,
  order_index integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Public, non-secret storefront settings only. Credentials never live here.
create table public.site_settings (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique check (key ~ '^[a-z0-9_]{1,64}$' and key not like '%secret%' and key not like '%api_key%' and key not like '%password%'),
  value      text not null check (char_length(value) <= 2000),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sales: inquiries, orders, payments
-- ---------------------------------------------------------------------------

create table public.inquiries (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null check (char_length(full_name) between 1 and 120),
  email        text not null check (char_length(email) <= 254),
  phone        text not null check (char_length(phone) <= 32),
  company_name text check (char_length(company_name) <= 160),
  product_id   uuid references public.products (id) on delete set null,
  product_name text,
  quantity     integer not null default 1 check (quantity between 1 and 100000),
  message      text not null check (char_length(message) <= 4000),
  status       text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'closed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index inquiries_created_at_idx on public.inquiries (created_at desc);
create index inquiries_product_id_idx on public.inquiries (product_id);

create sequence public.order_number_seq start 10001;

create table public.orders (
  id                    uuid primary key default gen_random_uuid(),
  order_number          text not null unique default ('SAMS-' || nextval('public.order_number_seq')),
  -- Unguessable handle given to the customer's browser so it can read back the
  -- status of its own order without being able to enumerate anyone else's.
  public_token          text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  order_type            text not null check (order_type in ('online', 'quotation')),
  customer_name         text not null check (char_length(customer_name) between 1 and 120),
  email                 text not null check (char_length(email) <= 254),
  phone                 text not null check (char_length(phone) <= 32),
  address               text not null check (char_length(address) <= 500),
  company_name          text check (char_length(company_name) <= 160),
  notes                 text check (char_length(notes) <= 2000),
  staff_notes           text check (char_length(staff_notes) <= 4000),
  total_amount          numeric(10, 3) not null check (total_amount > 0),
  total_minor           bigint not null check (total_minor > 0),
  currency              text not null default 'OMR' check (currency = 'OMR'),
  status                text not null check (status in (
                          'pending_payment', 'paid', 'failed', 'cancelled', 'refunded',
                          'manual_inquiry', 'placement', 'processing', 'shipping', 'delivered', 'completed')),
  payment_status        text not null check (payment_status in (
                          'initiated', 'pending', 'successful', 'failed', 'cancelled', 'refunded', 'unpaid', 'verified')),
  payment_provider      text not null check (payment_provider in ('paymob', 'manual')),
  paymob_order_id       text,
  paymob_transaction_id text,
  paid_at               timestamptz,
  items                 jsonb not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_email_idx on public.orders (lower(email));
create index orders_paid_at_idx on public.orders (paid_at) where paid_at is not null;

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  product_id   uuid references public.products (id) on delete set null,
  product_name text not null,
  product_slug text not null,
  make         text not null,
  weight       text not null,
  quantity     integer not null check (quantity > 0),
  unit_price   numeric(10, 3) not null check (unit_price >= 0),
  total_price  numeric(10, 3) not null check (total_price >= 0),
  -- Cost snapshot at order time so later cost edits do not rewrite past profit.
  unit_cost    numeric(10, 3),
  currency     text not null default 'OMR',
  created_at   timestamptz not null default now()
);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

create table public.payments (
  id                      uuid primary key default gen_random_uuid(),
  order_id                uuid not null references public.orders (id) on delete cascade,
  provider                text not null default 'paymob',
  -- Sent to Paymob as special_reference and echoed back as merchant_order_id.
  special_reference       text not null unique,
  intention_id            text unique,
  provider_order_id       text,
  provider_transaction_id text,
  amount_minor            bigint not null check (amount_minor > 0),
  currency                text not null default 'OMR',
  status                  text not null default 'initiated' check (status in (
                            'initiated', 'pending', 'successful', 'failed', 'amount_mismatch', 'error')),
  last_error              text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index payments_order_id_idx on public.payments (order_id);
create index payments_provider_order_id_idx on public.payments (provider_order_id);

create table public.payment_events (
  id                      uuid primary key default gen_random_uuid(),
  payment_id              uuid references public.payments (id) on delete set null,
  order_id                uuid references public.orders (id) on delete set null,
  provider                text not null default 'paymob',
  provider_transaction_id text not null,
  -- Transaction id plus its state: a replay of the same callback is dropped,
  -- but a later state of the same transaction (pending -> success) is not.
  dedupe_key              text not null unique,
  success                 boolean not null,
  pending                 boolean not null,
  amount_minor            bigint,
  currency                text,
  outcome                 text not null,
  payload                 jsonb not null,
  created_at              timestamptz not null default now()
);
create index payment_events_order_id_idx on public.payment_events (order_id);
create index payment_events_payment_id_idx on public.payment_events (payment_id);

create table public.rate_limits (
  key          text primary key,
  window_start timestamptz not null,
  hits         integer not null
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger categories_updated_at   before update on public.categories   for each row execute function public.set_updated_at();
create trigger products_updated_at     before update on public.products     for each row execute function public.set_updated_at();
create trigger product_costs_updated_at before update on public.product_costs for each row execute function public.set_updated_at();
create trigger certificates_updated_at before update on public.certificates for each row execute function public.set_updated_at();
create trigger testimonials_updated_at before update on public.testimonials for each row execute function public.set_updated_at();
create trigger faqs_updated_at         before update on public.faqs         for each row execute function public.set_updated_at();
create trigger site_settings_updated_at before update on public.site_settings for each row execute function public.set_updated_at();
create trigger inquiries_updated_at    before update on public.inquiries    for each row execute function public.set_updated_at();
create trigger orders_updated_at       before update on public.orders       for each row execute function public.set_updated_at();
create trigger payments_updated_at     before update on public.payments     for each row execute function public.set_updated_at();
create trigger products_price_history  after update of price on public.products for each row execute function public.log_price_change();

-- Staff may move an order through fulfilment, but a card payment that Paymob
-- confirmed can only be changed by the payment webhook (service role), never
-- from the dashboard.
create or replace function public.guard_order_staff_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.role()) = 'service_role' then
    return new;
  end if;
  if old.payment_provider = 'paymob'
     and new.payment_status is distinct from old.payment_status then
    raise exception 'Card payment status is set by Paymob and cannot be edited manually'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger orders_guard_staff_update before update on public.orders
  for each row execute function public.guard_order_staff_update();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.staff_profiles        enable row level security;
alter table public.categories            enable row level security;
alter table public.products              enable row level security;
alter table public.product_costs         enable row level security;
alter table public.product_price_history enable row level security;
alter table public.certificates          enable row level security;
alter table public.testimonials          enable row level security;
alter table public.faqs                  enable row level security;
alter table public.site_settings         enable row level security;
alter table public.inquiries             enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.payments              enable row level security;
alter table public.payment_events        enable row level security;
alter table public.rate_limits           enable row level security;

-- staff_profiles: each staff member sees their own row; the owner sees all.
create policy staff_profiles_select on public.staff_profiles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_owner()));

-- Public catalog: anyone reads active rows, staff read everything, owner writes.
create policy categories_public_read on public.categories for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy categories_owner_insert on public.categories for insert to authenticated with check ((select public.is_owner()));
create policy categories_owner_update on public.categories for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

create policy products_public_read on public.products for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy products_owner_insert on public.products for insert to authenticated with check ((select public.is_owner()));
create policy products_owner_update on public.products for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

create policy certificates_public_read on public.certificates for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy certificates_owner_insert on public.certificates for insert to authenticated with check ((select public.is_owner()));
create policy certificates_owner_update on public.certificates for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

create policy testimonials_public_read on public.testimonials for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy testimonials_owner_insert on public.testimonials for insert to authenticated with check ((select public.is_owner()));
create policy testimonials_owner_update on public.testimonials for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

create policy faqs_public_read on public.faqs for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy faqs_owner_insert on public.faqs for insert to authenticated with check ((select public.is_owner()));
create policy faqs_owner_update on public.faqs for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

create policy site_settings_public_read on public.site_settings for select to anon, authenticated using (true);
create policy site_settings_owner_insert on public.site_settings for insert to authenticated with check ((select public.is_owner()));
create policy site_settings_owner_update on public.site_settings for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

-- Owner-only financial tables.
create policy product_costs_owner_all on public.product_costs for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
create policy product_price_history_owner_read on public.product_price_history for select to authenticated
  using ((select public.is_owner()));
create policy order_items_owner_read on public.order_items for select to authenticated
  using ((select public.is_owner()));
create policy payments_owner_read on public.payments for select to authenticated
  using ((select public.is_owner()));
create policy payment_events_owner_read on public.payment_events for select to authenticated
  using ((select public.is_owner()));

-- Sales pipeline: every active staff member reads and progresses it.
create policy inquiries_staff_read on public.inquiries for select to authenticated using ((select public.is_staff()));
create policy inquiries_staff_update on public.inquiries for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy orders_staff_read on public.orders for select to authenticated using ((select public.is_staff()));
create policy orders_staff_update on public.orders for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Column privileges back the policies: staff can change workflow fields only,
-- never amounts, customer identity, tokens or Paymob references.
revoke insert, update, delete on public.orders from anon, authenticated;
grant update (status, payment_status, staff_notes) on public.orders to authenticated;
revoke insert, update, delete on public.inquiries from anon, authenticated;
grant update (status) on public.inquiries to authenticated;
revoke all on public.payments, public.payment_events, public.order_items, public.rate_limits,
  public.product_price_history from anon;
revoke insert, update, delete on public.payments, public.payment_events, public.order_items,
  public.rate_limits, public.product_price_history, public.staff_profiles from authenticated;
revoke all on public.staff_profiles, public.product_costs from anon;
revoke delete on public.products, public.categories, public.faqs, public.certificates,
  public.testimonials, public.site_settings from anon, authenticated;
revoke insert, update on public.products, public.categories, public.faqs, public.certificates,
  public.testimonials, public.site_settings from anon;
revoke usage on sequence public.order_number_seq from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Server-only functions (service_role)
-- ---------------------------------------------------------------------------

-- Fixed-window rate limiter. Returns true when the call is allowed.
create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
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

-- Creates an order and its line items in one transaction, pricing every line
-- from the products table. The caller supplies only slugs and quantities.
create or replace function public.create_checkout_order(p_customer jsonb, p_items jsonb, p_order_type text)
returns table (order_id uuid, order_number text, public_token text, total_amount numeric, total_minor bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item      jsonb;
  v_product   public.products%rowtype;
  v_qty       integer;
  v_total     numeric(10, 3) := 0;
  v_snapshots jsonb := '[]'::jsonb;
  v_order     public.orders%rowtype;
begin
  if p_order_type not in ('online', 'quotation') then
    raise exception 'INVALID_ORDER_TYPE';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'INVALID_ITEMS';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 1000 then
      raise exception 'INVALID_QUANTITY';
    end if;

    select * into v_product from public.products p
    where p.slug = v_item ->> 'slug' and p.is_active;
    if not found then
      raise exception 'PRODUCT_NOT_FOUND:%', v_item ->> 'slug';
    end if;

    v_total := v_total + v_product.price * v_qty;
    v_snapshots := v_snapshots || jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'product_slug', v_product.slug,
      'make', v_product.make,
      'weight', v_product.weight,
      'quantity', v_qty,
      'unit_price', v_product.price,
      'total_price', v_product.price * v_qty,
      'currency', v_product.currency
    );
  end loop;

  insert into public.orders (
    order_type, customer_name, email, phone, address, company_name, notes,
    total_amount, total_minor, currency, status, payment_status, payment_provider, items
  ) values (
    p_order_type,
    p_customer ->> 'full_name',
    lower(p_customer ->> 'email'),
    p_customer ->> 'phone',
    p_customer ->> 'address',
    nullif(p_customer ->> 'company_name', ''),
    nullif(p_customer ->> 'notes', ''),
    v_total,
    (v_total * 1000)::bigint,
    'OMR',
    case when p_order_type = 'online' then 'pending_payment' else 'manual_inquiry' end,
    case when p_order_type = 'online' then 'initiated' else 'unpaid' end,
    case when p_order_type = 'online' then 'paymob' else 'manual' end,
    v_snapshots
  )
  returning * into v_order;

  insert into public.order_items (
    order_id, product_id, product_name, product_slug, make, weight,
    quantity, unit_price, total_price, unit_cost, currency
  )
  select v_order.id, (s ->> 'product_id')::uuid, s ->> 'product_name', s ->> 'product_slug',
         s ->> 'make', s ->> 'weight', (s ->> 'quantity')::integer,
         (s ->> 'unit_price')::numeric, (s ->> 'total_price')::numeric,
         pc.unit_cost, s ->> 'currency'
  from jsonb_array_elements(v_snapshots) s
  left join public.product_costs pc on pc.product_id = (s ->> 'product_id')::uuid;

  return query select v_order.id, v_order.order_number, v_order.public_token, v_order.total_amount, v_order.total_minor;
end;
$$;

-- Applies one HMAC-verified Paymob transaction callback. Idempotent and
-- monotonic: a replay is a no-op, the amount must match the order exactly, and
-- a paid order is never moved back to pending or failed.
create or replace function public.apply_paymob_transaction(
  p_special_reference text,
  p_provider_order_id text,
  p_transaction_id    text,
  p_amount_minor      bigint,
  p_currency          text,
  p_success           boolean,
  p_pending           boolean,
  p_payload           jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_order   public.orders%rowtype;
  v_outcome text;
  v_inserted integer;
begin
  select * into v_payment from public.payments
  where (p_special_reference is not null and special_reference = p_special_reference)
     or (p_provider_order_id is not null and provider_order_id = p_provider_order_id)
  order by (special_reference = p_special_reference) desc nulls last
  limit 1
  for update;

  if not found then
    return 'unknown_payment';
  end if;

  select * into v_order from public.orders where id = v_payment.order_id for update;

  if v_order.payment_status = 'successful' then
    v_outcome := case when p_success and not p_pending then 'already_paid' else 'ignored_after_paid' end;
  elsif p_pending then
    v_outcome := 'pending';
  elsif p_success then
    if p_amount_minor is distinct from v_order.total_minor or upper(p_currency) is distinct from v_order.currency then
      v_outcome := 'amount_mismatch';
    else
      v_outcome := 'paid';
    end if;
  else
    v_outcome := 'failed';
  end if;

  insert into public.payment_events (
    payment_id, order_id, provider_transaction_id, dedupe_key, success, pending,
    amount_minor, currency, outcome, payload
  ) values (
    v_payment.id, v_order.id, p_transaction_id,
    p_transaction_id || ':' || p_success::text || ':' || p_pending::text,
    p_success, p_pending, p_amount_minor, p_currency, v_outcome, p_payload
  )
  on conflict (dedupe_key) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return 'duplicate';
  end if;

  if v_outcome = 'paid' then
    update public.orders
       set status = 'paid', payment_status = 'successful', paid_at = now(),
           paymob_transaction_id = p_transaction_id,
           paymob_order_id = coalesce(p_provider_order_id, paymob_order_id)
     where id = v_order.id;
    update public.payments
       set status = 'successful', provider_transaction_id = p_transaction_id,
           provider_order_id = coalesce(p_provider_order_id, provider_order_id)
     where id = v_payment.id;
  elsif v_outcome = 'pending' then
    update public.orders set payment_status = 'pending' where id = v_order.id;
    update public.payments set status = 'pending', provider_transaction_id = p_transaction_id where id = v_payment.id;
  elsif v_outcome = 'failed' then
    update public.orders set status = 'failed', payment_status = 'failed' where id = v_order.id;
    update public.payments set status = 'failed', provider_transaction_id = p_transaction_id where id = v_payment.id;
  elsif v_outcome = 'amount_mismatch' then
    update public.payments
       set status = 'amount_mismatch', provider_transaction_id = p_transaction_id,
           last_error = format('Paid %s %s, expected %s %s', p_amount_minor, p_currency, v_order.total_minor, v_order.currency)
     where id = v_payment.id;
    update public.orders
       set staff_notes = concat_ws(E'\n', staff_notes,
             format('[%s] Paymob reported a paid amount that does not match this order. Check transaction %s before shipping.', now()::date, p_transaction_id))
     where id = v_order.id;
  end if;

  return v_outcome;
end;
$$;

-- Status lookup for the customer's own order, keyed by its unguessable token.
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
$$;

-- Order tracking by order number plus the email or phone used at checkout.
create or replace function public.track_order(p_order_number text, p_contact text)
returns table (order_number text, status text, payment_status text, total_amount numeric, currency text,
               items jsonb, created_at timestamptz, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select o.order_number, o.status, o.payment_status, o.total_amount, o.currency,
         (select jsonb_agg(jsonb_build_object('product_name', i ->> 'product_name', 'quantity', i -> 'quantity'))
            from jsonb_array_elements(o.items) i),
         o.created_at, o.updated_at
  from public.orders o
  where upper(o.order_number) = upper(trim(p_order_number))
    and (lower(o.email) = lower(trim(p_contact))
         or regexp_replace(o.phone, '\D', '', 'g') = regexp_replace(p_contact, '\D', '', 'g')
            and length(regexp_replace(p_contact, '\D', '', 'g')) >= 8)
$$;

revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.create_checkout_order(jsonb, jsonb, text) from public, anon, authenticated;
revoke execute on function public.apply_paymob_transaction(text, text, text, bigint, text, boolean, boolean, jsonb) from public, anon, authenticated;
revoke execute on function public.get_order_status(text) from public, anon, authenticated;
revoke execute on function public.track_order(text, text) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
grant execute on function public.create_checkout_order(jsonb, jsonb, text) to service_role;
grant execute on function public.apply_paymob_transaction(text, text, text, bigint, text, boolean, boolean, jsonb) to service_role;
grant execute on function public.get_order_status(text) to service_role;
grant execute on function public.track_order(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Owner reporting
-- ---------------------------------------------------------------------------

-- Revenue counts only payments that actually settled: Paymob-confirmed card
-- payments and manual orders the team marked as verified.
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

  with settled as (
    select o.* from public.orders o
    where (o.payment_status = 'successful' or o.payment_status = 'verified')
      and o.status not in ('cancelled', 'refunded')
      and coalesce(o.paid_at, o.created_at) >= p_from
      and coalesce(o.paid_at, o.created_at) < p_to
  ),
  lines as (
    select i.* from public.order_items i join settled s on s.id = i.order_id
  )
  select jsonb_build_object(
    'revenue',          coalesce((select sum(total_amount) from settled), 0),
    'orders',           (select count(*) from settled),
    'units',            coalesce((select sum(quantity) from lines), 0),
    'cost',             coalesce((select sum(unit_cost * quantity) from lines where unit_cost is not null), 0),
    'costed_revenue',   coalesce((select sum(total_price) from lines where unit_cost is not null), 0),
    'uncosted_revenue', coalesce((select sum(total_price) from lines where unit_cost is null), 0),
    'online_revenue',   coalesce((select sum(total_amount) from settled where order_type = 'online'), 0),
    'manual_revenue',   coalesce((select sum(total_amount) from settled where order_type = 'quotation'), 0),
    'pending_payment',  (select count(*) from public.orders where status = 'pending_payment' and created_at >= p_from and created_at < p_to),
    'failed_payment',   (select count(*) from public.orders where payment_status = 'failed' and created_at >= p_from and created_at < p_to),
    'by_month', coalesce((
      select jsonb_agg(m order by m ->> 'month')
      from (
        select jsonb_build_object(
          'month', to_char(date_trunc('month', coalesce(paid_at, created_at) at time zone 'Asia/Muscat'), 'YYYY-MM'),
          'revenue', sum(total_amount),
          'orders', count(*)) m
        from settled
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

revoke execute on function public.get_sales_report(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_sales_report(timestamptz, timestamptz) to authenticated;
-- anon needs is_staff() because the public catalog policies call it (it simply
-- returns false for a visitor with no session).
revoke execute on function public.staff_role(), public.is_staff(), public.is_owner() from public;
grant execute on function public.staff_role(), public.is_staff(), public.is_owner() to anon, authenticated;
