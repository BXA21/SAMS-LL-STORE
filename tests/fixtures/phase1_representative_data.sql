-- Representative Phase 1 data, created ONLY through Phase 1 database
-- functions, for testing the Phase 2 upgrade path on a local database.
do $$
declare
  o record;
  pay_id uuid;
  cb uuid;
begin
  -- Same role the app's server-side calls carry through the API.
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- 1. Paid card order
  select * into o from public.create_checkout_order(
    '{"full_name":"FIXTURE Paid","email":"fixture.paid@example.com","phone":"+96890000001","address":"Fixture address, Muscat"}',
    '[{"slug":"gfo-baby-fire-ball-400-gms","quantity":2}]', 'online');
  insert into public.payments (order_id, special_reference, amount_minor, provider_order_id, status, integration_ids, environment)
  values (o.order_id, o.order_number || '-fx1', o.total_minor, '880001', 'pending', array[69632], 'test') returning id into pay_id;
  cb := public.record_paymob_callback('880000001', '880001', o.order_number || '-fx1', 69632, o.total_minor, 'OMR', true, false, false, false, false, false,
                                      '{"type":"TRANSACTION","obj":{"id":880000001}}');
  perform public.process_paymob_callback(cb);

  -- 2. Pending card order (customer still on Paymob)
  select * into o from public.create_checkout_order(
    '{"full_name":"FIXTURE Pending","email":"fixture.pending@example.com","phone":"+96890000002","address":"Fixture address, Muscat"}',
    '[{"slug":"gfo-fire-drum-5-kg","quantity":1}]', 'online');
  insert into public.payments (order_id, special_reference, amount_minor, provider_order_id, status, integration_ids, environment)
  values (o.order_id, o.order_number || '-fx2', o.total_minor, '880002', 'pending', array[69632], 'test');

  -- 3. Declined card order
  select * into o from public.create_checkout_order(
    '{"full_name":"FIXTURE Declined","email":"fixture.failed@example.com","phone":"+96890000003","address":"Fixture address, Muscat"}',
    '[{"slug":"afo-fire-ball-extinguisher-1-5-kg","quantity":1}]', 'online');
  insert into public.payments (order_id, special_reference, amount_minor, provider_order_id, status, integration_ids, environment)
  values (o.order_id, o.order_number || '-fx3', o.total_minor, '880003', 'pending', array[69632], 'test');
  cb := public.record_paymob_callback('880000003', '880003', o.order_number || '-fx3', 69632, o.total_minor, 'OMR', false, false, false, false, false, false,
                                      '{"type":"TRANSACTION","obj":{"id":880000003}}');
  perform public.process_paymob_callback(cb);

  -- 4. Quotation, offline payment recorded, in fulfilment
  select * into o from public.create_checkout_order(
    '{"full_name":"FIXTURE Quote","email":"fixture.quote@example.com","phone":"+96890000004","address":"Fixture address, Muscat"}',
    '[{"slug":"gfo-flowerpot-extinguisher-1-3-kg","quantity":3}]', 'quotation');
  update public.orders set status = 'placement' where id = o.order_id;
  update public.orders set payment_status = 'verified' where id = o.order_id;
  update public.orders set status = 'processing' where id = o.order_id;

  -- 5. Cancelled quotation
  select * into o from public.create_checkout_order(
    '{"full_name":"FIXTURE Cancelled","email":"fixture.cancel@example.com","phone":"+96890000005","address":"Fixture address, Muscat"}',
    '[{"slug":"gfo-green-fire-ball-1-3-kg","quantity":1}]', 'quotation');
  update public.orders set status = 'cancelled' where id = o.order_id;

  -- 6. Unmatched capture alert
  cb := public.record_paymob_callback('880000099', '889999', 'SAMS-UNKNOWN', 69632, 5000, 'OMR', true, false, false, false, false, false,
                                      '{"type":"TRANSACTION","obj":{"id":880000099}}');
  perform public.process_paymob_callback(cb);
end
$$;
