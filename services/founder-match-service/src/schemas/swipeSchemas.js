import { z } from "zod";

export const nextCandidateQuerySchema = z.object({
  query: z.object({
    role: z.enum(["tech", "business", "design", "growth"]).optional(),
    stage: z.enum(["idea", "mvp", "revenue"]).optional(),
    commitment: z.enum(["full_time", "part_time", "exploring"]).optional(),
    industry: z.string().optional(),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const swipeBodySchema = z.object({
  body: z.object({
    targetUserId: z.string().uuid(),
    type: z.enum(["pass", "interested", "super"]),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

