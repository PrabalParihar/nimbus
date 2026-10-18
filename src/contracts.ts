import { z } from 'zod';

export const identifier = z.string().min(1).max(128).regex(/^[A-Za-z0-9._:-]+$/);
export const quantity = z.number().int().min(1).max(10_000);
export const productPatch = z.strictObject({
  name: z.string().trim().min(1).max(120).optional(),
  unitPriceCents: z.number().int().min(0).max(1_000_000_000).optional(),
  available: z.number().int().min(0).max(1_000_000_000).optional(),
}).refine(value => Object.keys(value).length > 0, 'Provide at least one product field');
export const productSchema = z.strictObject({
  id: identifier,
  name: z.string().trim().min(1).max(120),
  unitPriceCents: z.number().int().min(0).max(1_000_000_000),
  available: z.number().int().min(0).max(1_000_000_000),
});
export type Product = z.infer<typeof productSchema>;
export type ProductPatch = z.infer<typeof productPatch>;
export const emptyBody = z.strictObject({});
export const addItemBody = z.strictObject({ productId: identifier, quantity });
export const setItemBody = z.strictObject({ quantity });
export const checkoutBody = z.strictObject({ couponCode: identifier.optional() });
export const configSchema = z.strictObject({
  rewardEvery: z.number().int().min(1).max(1_000_000),
  discountPercent: z.number().int().min(1).max(100),
});
