import { z } from "zod";
import { cursorLimitQuery, uuidSchema } from "./common.js";

export const createProposalSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: z.object({
    cover_letter: z.string().min(20).max(5000),
    proposed_amount: z.number().nonnegative(),
    estimated_days: z.number().int().positive().optional(),
  }),
  query: z.object({}).optional(),
});

export const listProposalsSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: z.object({}).optional(),
  query: cursorLimitQuery,
});

export const acceptProposalSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const rejectProposalSchema = acceptProposalSchema;
