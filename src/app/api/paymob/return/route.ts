import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract Paymob params
    const transactionId = searchParams.get('id');
    const success = searchParams.get('success') === 'true';
    const pending = searchParams.get('pending') === 'true';
    const merchantOrderId = searchParams.get('merchant_order_id');
    
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // Decipher result status
    const isSuccessful = success && !pending;
    
    // Redirect customer to frontend checkout result page
    const resultUrl = new URL(`${siteUrl}/checkout/result`);
    resultUrl.searchParams.set('success', String(isSuccessful));
    if (transactionId) resultUrl.searchParams.set('transactionId', transactionId);
    if (merchantOrderId) resultUrl.searchParams.set('orderId', merchantOrderId);

    return NextResponse.redirect(resultUrl.toString());

  } catch (error) {
    console.error('Paymob return processing failed:', error);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${siteUrl}/checkout/result?success=false`);
  }
}
