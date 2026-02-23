import { z } from "zod";

export const createGroupSchema = z.object({
  params: z.object({
    tribeId: z.string().uuid("Invalid tribe ID"),
  }),
  body: z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    description: z.string().max(500).optional(),
    avatar_url: z.string().min(1).optional(),
  }),
});

export const updateGroupSchema = z.object({
  params: z.object({
    tribeId: z.string().uuid("Invalid tribe ID"),
    groupId: z.string().uuid("Invalid group ID"),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    avatar_url: z.string().min(1).nullable().optional(),
  }),
});

export const groupIdParamSchema = z.object({
  params: z.object({
    tribeId: z.string().uuid("Invalid tribe ID"),
    groupId: z.string().uuid("Invalid group ID"),
  }),
});
