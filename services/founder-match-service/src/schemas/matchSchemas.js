import { z } from "zod";

export const listMatchesQuerySchema = z.object({
  query: z.object({
    sort: z.enum(["recent", "compatibility", "activity"]).default("recent"),
    cursor: z.string().optional(),
    limit: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : undefined)),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const matchIdParamSchema = z.object({
  params: z.object({
    matchId: z.string().uuid(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

