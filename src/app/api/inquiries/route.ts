import { apiError, apiOk, enforceRateLimit, logServer, readJson } from '@/lib/apiHelpers';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { inquirySchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Contact / product enquiry form. */
export async function POST(request: Request) {
  const db = getSupabaseAdmin();
  if (!db) {
    return apiError(503, 'SERVICE_UNAVAILABLE', 'The enquiry form is temporarily unavailable. Please contact us on WhatsApp.');
  }

  const body = await readJson(request, inquirySchema);
  if (!body.ok) return body.response;
  const input = body.value;

  // Bots fill the hidden honeypot field; accept silently so they learn nothing.
  if (input.website) return apiOk({ received: true }, 201);

  const limit = await enforceRateLimit(db, 'inquiry', request, 5, 600);
  if (!limit.ok) return limit.response;

  let productId: string | null = null;
  let productName: string | null = null;
  if (input.productSlug) {
    const { data: product } = await db
      .from('products')
      .select('id, name')
      .eq('slug', input.productSlug)
      .eq('is_active', true)
      .maybeSingle();
    productId = product?.id ?? null;
    productName = product?.name ?? null;
  }

  const { error } = await db.from('inquiries').insert({
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    company_name: input.companyName ?? null,
    product_id: productId,
    product_name: productName ?? 'General enquiry',
    quantity: input.quantity,
    message: input.message,
  });

  if (error) {
    logServer('inquiry_insert_failed', { message: error.message });
    return apiError(500, 'INTERNAL_ERROR', 'We could not send your enquiry. Please try again or contact us on WhatsApp.');
  }

  return apiOk({ received: true }, 201);
}
