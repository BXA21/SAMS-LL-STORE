import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { dbService } from '@/services/dbService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Check if simulated callback (development testing)
    if (body.is_simulated && body.orderId) {
      const orderId = body.orderId;
      const success = body.success;
      
      const newStatus = success ? 'paid' : 'failed';
      const paymentStatus = success ? 'successful' : 'failed';
      
      await dbService.updateOrderStatus(orderId, newStatus, paymentStatus);
      return NextResponse.json({ message: 'Simulated order status updated' });
    }

    // --- REAL PAYMOB HMAC SIGNATURE VERIFICATION ---
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET || '';
    const hmacHeader = request.headers.get('hmac') || new URL(request.url).searchParams.get('hmac');

    if (!hmacHeader) {
      return NextResponse.json({ message: 'Missing hmac signature' }, { status: 400 });
    }

    const txn = body.obj;
    if (!txn) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    // Paymob signature validation fields in exact required concatenation sequence
    const dataToHash = [
      txn.amount_cents,
      txn.created_at,
      txn.currency,
      txn.error_occured,
      txn.has_parent_transaction,
      txn.id,
      txn.integration_id,
      txn.is_3d_secure,
      txn.is_auth,
      txn.is_capture,
      txn.is_voided,
      txn.is_refunded,
      txn.owner,
      txn.pending,
      txn.source_data?.pan,
      txn.source_data?.sub_type,
      txn.source_data?.type,
      txn.success
    ].map(val => (val === undefined || val === null ? '' : String(val))).join('');

    const calculatedHmac = crypto
      .createHmac('sha512', hmacSecret)
      .update(dataToHash)
      .digest('hex');

    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(calculatedHmac),
      Buffer.from(hmacHeader)
    );

    if (!isSignatureValid) {
      console.warn('Invalid Paymob signature HMAC matching attempt!');
      return NextResponse.json({ message: 'Invalid signature HMAC' }, { status: 401 });
    }

    // Process Transaction Status
    const paymobOrderId = txn.order?.id;
    const isSuccess = txn.success === true && txn.pending === false;

    // Find the matching order by Paymob Order ID in database
    const orders = await dbService.getOrders();
    const matchingOrder = orders.find(o => o.paymob_order_id === String(paymobOrderId) || o.id === String(txn.order?.merchant_order_id));

    if (!matchingOrder) {
      return NextResponse.json({ message: `Matching SAMS order not found for Paymob Order ID: ${paymobOrderId}` }, { status: 404 });
    }

    const orderStatus = isSuccess ? 'paid' : 'failed';
    const paymentStatus = isSuccess ? 'successful' : 'failed';

    // Update order status in Supabase/localStorage
    await dbService.updateOrderStatus(matchingOrder.id, orderStatus, paymentStatus);

    return NextResponse.json({ message: 'Order status updated successfully' });

  } catch (error: any) {
    console.error('Paymob Webhook process error:', error);
    return NextResponse.json({ message: error.message || 'Webhook parsing failed' }, { status: 500 });
  }
}
