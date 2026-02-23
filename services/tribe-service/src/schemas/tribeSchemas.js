import { z } from "zod";

export const createTribeSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    description: z.string().max(1000).optional(),
    avatar_url: z.string().min(1).optional(),
    cover_url: z.string().min(1).optional(),
    is_public: z.boolean().optional().default(true),
  }),
});

export const updateTribeSchema = z.object({
  params: z.object({
    tribeId: z.string().uuid("Invalid tribe ID"),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(1000).optional(),
    avatar_url: z.string().min(1).nullable().optional(),
    cover_url: z.string().min(1).nullable().optional(),
    is_public: z.boolean().optional(),
  }),
});

export const tribeIdParamSchema = z.object({
  params: z.object({
    tribeId: z.string().uuid("Invalid tribe ID"),
  }),
});
