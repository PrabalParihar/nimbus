import { z } from 'zod';
import { configSchema } from './contracts.js';

const integerText = z.string().regex(/^\d+$/, 'Must contain decimal integer digits').transform(Number);
export function readConfig(input: { PORT?: string | undefined; HOST?: string | undefined; REWARD_EVERY?: string | undefined; DISCOUNT_PERCENT?: string | undefined }) {
  const port = z.number().int().min(0).max(65_535).parse(integerText.parse(input.PORT ?? '3000'));
  const host = z.enum(['127.0.0.1', '0.0.0.0', '::1']).parse(input.HOST ?? '127.0.0.1');
  const rewards = configSchema.parse({
    rewardEvery: integerText.parse(input.REWARD_EVERY ?? '5'),
    discountPercent: integerText.parse(input.DISCOUNT_PERCENT ?? '10'),
  });
  return { port, host, ...rewards };
}
