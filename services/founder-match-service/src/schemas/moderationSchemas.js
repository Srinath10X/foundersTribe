import { z } from "zod";

export const blockUserSchema = z.object({
  body: z.object({
    blockedUserId: z.string().uuid(),
    reason: z.string().max(1000).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const reportUserSchema = z.object({
  body: z.object({
    reportedUserId: z.string().uuid(),
    matchId: z.string().uuid().optional(),
    reason: z.string().min(5).max(1000),
    metadata: z.record(z.any()).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

