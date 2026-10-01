-- Match tracking phone numbers on the last 8 digits (an Omani subscriber
-- number), so "+968 9123 4567", "96891234567" and "91234567" all match.
create or replace function public.track_order(p_order_number text, p_contact text)
returns table (order_number text, order_type text, status text, payment_status text, total_amount numeric, currency text,
               items jsonb, customer_name text, email text, address text, created_at timestamptz, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select o.order_number, o.order_type, o.status, o.payment_status, o.total_amount, o.currency,
         (select jsonb_agg(jsonb_build_object(
                   'product_name', i ->> 'product_name',
                   'product_slug', i ->> 'product_slug',
                   'weight', i ->> 'weight',
                   'quantity', (i ->> 'quantity')::integer,
                   'total_price', (i ->> 'total_price')::numeric))
            from jsonb_array_elements(o.items) i),
         o.customer_name, o.email, o.address, o.created_at, o.updated_at
  from public.orders o
  where upper(o.order_number) = upper(trim(p_order_number))
    and (lower(o.email) = lower(trim(p_contact))
         or (length(regexp_replace(p_contact, '\D', '', 'g')) >= 8
             and right(regexp_replace(o.phone, '\D', '', 'g'), 8) = right(regexp_replace(p_contact, '\D', '', 'g'), 8)))
$$;

revoke execute on function public.track_order(text, text) from public, anon, authenticated;
grant execute on function public.track_order(text, text) to service_role;
