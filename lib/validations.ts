import { z } from 'zod';

export const exchangeSchema = z.object({ milestone: z.union([z.literal(200000), z.literal(500000), z.literal(1000000)]) });
export const withdrawalSchema = z.object({
  red_pocket_amount: z.number().finite().min(200),
  method: z.enum(['jazzcash', 'easypaisa', 'bank']),
  account_name: z.string().trim().min(2),
  account_number: z.string().trim().min(5),
});
