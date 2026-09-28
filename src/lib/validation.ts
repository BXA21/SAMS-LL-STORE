import { z } from 'zod';

/*
 * Shared request schemas. The browser forms use the same rules for inline
 * errors; the route handlers re-validate everything regardless.
 */

const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((v) => !/[<>]/.test(v), 'Angle brackets are not allowed');

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((v) => !/[<>]/.test(v), 'Angle brackets are not allowed')
    .optional()
    .transform((v) => (v ? v : undefined));

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{8,20}$/, 'Enter a valid phone number');

export const customerSchema = z.object({
  fullName: text(3, 120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  phone: phoneSchema,
  address: text(10, 500),
  companyName: optionalText(160),
  notes: optionalText(2000),
});

export const cartLineSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Invalid product').max(120),
  quantity: z.number().int().min(1).max(1000),
});

export const checkoutSchema = z.object({
  customer: customerSchema,
  items: z
    .array(cartLineSchema)
    .min(1, 'Your cart is empty')
    .max(20)
    .refine((items) => new Set(items.map((i) => i.slug)).size === items.length, 'Duplicate products in cart'),
});

export const inquirySchema = z.object({
  fullName: text(2, 120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  phone: phoneSchema,
  companyName: optionalText(160),
  productSlug: z.string().trim().max(120).optional(),
  quantity: z.number().int().min(1).max(100000),
  message: text(5, 4000),
  // Honeypot field: real users never see or fill it.
  website: z.string().max(0).optional(),
});

export const trackSchema = z.object({
  orderNumber: z.string().trim().regex(/^SAMS-\d{4,10}$/i, 'Order numbers look like SAMS-10001'),
  contact: z.string().trim().min(5).max(254),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type InquiryInput = z.infer<typeof inquirySchema>;
