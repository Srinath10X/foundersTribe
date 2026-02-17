import { z } from "zod";

export const createInviteSchema = z.object({
  params: z.object({
    tribeId: z.string().uuid("Invalid tribe ID"),
  }),
  body: z.object({
    max_uses: z.number().int().positive().optional(),
    expires_at: z.string().datetime().optional(),
  }),
});

export const redeemInviteSchema = z.object({
  params: z.object({
    code: z.string().min(6).max(20),
  }),
});
