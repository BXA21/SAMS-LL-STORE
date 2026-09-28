-- Trigger functions run as triggers only; they are not part of the public API.
revoke execute on function public.log_price_change(), public.set_updated_at(), public.guard_order_staff_update() from public, anon, authenticated;
