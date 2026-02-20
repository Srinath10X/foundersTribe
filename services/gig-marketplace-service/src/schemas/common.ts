import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const cursorLimitQuery = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional().transform((v) => (v ? Number(v) : undefined)),
});

export const gigStatusEnum = z.enum(["draft", "open", "in_progress", "completed", "cancelled"]);
export const proposalStatusEnum = z.enum(["pending", "shortlisted", "accepted", "rejected", "withdrawn"]);
export const contractStatusEnum = z.enum(["active", "completed", "cancelled", "disputed"]);
