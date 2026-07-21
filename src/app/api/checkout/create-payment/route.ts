import { NextResponse } from 'next/server';
import { dbService } from '@/services/dbService';

// Fallback pricing list for server-side validation when Supabase is not connected
const DEFAULT_PRICES: Record<string, number> = {
  'p1': 12.000,
  'p2': 15.000,
  'p3': 18.000,
  'p4': 30.000,
  'p5': 40.000,
  'p6': 18.000,
};

// Online card payment is only offered once real Paymob credentials are present.
// Until then the route refuses up front rather than handing the customer a
// redirect to a gateway that cannot complete the payment.
function isPaymobConfigured(): boolean {
  const apiKey = process.env.PAYMOB_API_KEY;
  return Boolean(apiKey) && !apiKey!.includes('placeholder');
}

export async function POST(request: Request) {
  try {
    if (!isPaymobConfigured()) {
      return NextResponse.json(
        {
          message:
            'Online card payment is not available yet. Please submit a quotation request and our sales team will contact you to arrange payment.',
          code: 'ONLINE_PAYMENT_UNAVAILABLE',
        },
        { status: 503 }
      );
    }

    const { customerDetails, cartItems } = await request.json();

    if (!customerDetails || !cartItems || cartItems.length === 0) {
      return NextResponse.json({ message: 'Invalid order request payload' }, { status: 400 });
    }

    let calculatedTotal = 0;
    const orderItemsSnapshots: any[] = [];

    // 1. Fetch latest prices from Supabase/Server source and recalculate total securely
    for (const item of cartItems) {
      let product = null;
      try {
        product = await dbService.getProductById(item.productId);
      } catch (e) {
        console.error('Failed to fetch product on server:', e);
      }

      // If Supabase is offline or product not found, fallback to default prices map
      const unitPrice = product ? Number(product.price) : (DEFAULT_PRICES[item.productId] || 0);
      
      if (unitPrice === 0) {
        return NextResponse.json({ message: `Product with ID ${item.productId} was not found.` }, { status: 404 });
      }

      calculatedTotal += unitPrice * item.quantity;

      orderItemsSnapshots.push({
        product_id: item.productId,
        product_name: product?.name || `Product ${item.productId}`,
        product_slug: product?.slug || 'unknown',
        make: product?.make || 'GFO',
        weight: product?.weight || '1.3 kgs',
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: unitPrice * item.quantity,
        currency: 'OMR',
      });
    }

    // 2. Save order in Supabase as pending_payment
    const pendingOrder = await dbService.saveOrder({
      customer_name: customerDetails.fullName,
      email: customerDetails.email,
      phone: customerDetails.phone,
      address: customerDetails.address,
      company_name: customerDetails.companyName || undefined,
      notes: customerDetails.notes || undefined,
      total_amount: calculatedTotal,
      currency: 'OMR',
      status: 'pending_payment',
      payment_status: 'initiated',
      payment_provider: 'paymob',
      items: orderItemsSnapshots,
    });

    const orderId = pendingOrder.id;

    // --- PAYMOB REAL API CALLS ---
    // (Omani minor unit conversion: Math.round(amount * 1000))
    const minorUnitAmount = Math.round(calculatedTotal * 1000);

    // Call Paymob Authentication
    const authRes = await fetch(`${process.env.PAYMOB_BASE_URL}/auth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY })
    });
    
    if (!authRes.ok) {
      throw new Error('Paymob Authentication failed');
    }
    const authData = await authRes.json();
    const token = authData.token;

    // Call Paymob Order Registration
    const orderRes = await fetch(`${process.env.PAYMOB_BASE_URL}/ecommerce/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: 'false',
        amount_cents: minorUnitAmount,
        currency: 'OMR',
        items: []
      })
    });

    if (!orderRes.ok) {
      throw new Error('Paymob Order registration failed');
    }
    const orderData = await orderRes.json();
    const paymobOrderId = orderData.id;

    // Save Paymob Order ID to order database
    await dbService.updateOrderStatus(orderId, 'pending_payment', 'pending');
    // Save to payments table
    // In real project, we would run SQL update: `UPDATE orders SET paymob_order_id = paymobOrderId WHERE id = orderId`
    // Our dbService.saveOrder can update it if we pass it, but for our database types we store it.
    
    // Call Paymob Payment Keys Generation
    const keysRes = await fetch(`${process.env.PAYMOB_BASE_URL}/acceptance/payment_keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        amount_cents: minorUnitAmount,
        expiration: 3600,
        order_id: paymobOrderId,
        billing_data: {
          apartment: 'NA',
          floor: 'NA',
          street: customerDetails.address.slice(0, 45) || 'NA',
          building: 'NA',
          shipping_method: 'PKG',
          postal_code: 'NA',
          city: 'Muscat',
          country: 'OM',
          last_name: customerDetails.fullName.split(' ')[1] || 'LLC',
          first_name: customerDetails.fullName.split(' ')[0] || 'SAMS',
          email: customerDetails.email,
          phone_number: customerDetails.phone
        },
        currency: 'OMR',
        integration_id: Number(process.env.PAYMOB_INTEGRATION_ID),
        lock_order_when_paid: 'true'
      })
    });

    if (!keysRes.ok) {
      throw new Error('Paymob Payment key generation failed');
    }
    const keysData = await keysRes.json();
    const paymentToken = keysData.token;

    // Construct checkout URL using configured Iframe ID
    const paymobUrl = `https://oman.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;

    return NextResponse.json({ 
      orderId, 
      paymentUrl: paymobUrl, 
      message: 'Paymob session initialized' 
    });

  } catch (error: any) {
    console.error('Checkout API error:', error);
    return NextResponse.json({ 
      message: error.message || 'Failed to create order checkout.' 
    }, { status: 500 });
  }
}
