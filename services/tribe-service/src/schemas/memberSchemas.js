import { z } from "zod";

export const joinTribeSchema = z.object({
  params: z.object({
    tribeId: z.string().uuid("Invalid tribe ID"),
  }),
});

export const joinGroupSchema = z.object({
  params: z.object({
    tribeId: z.string().uuid("Invalid tribe ID"),
    groupId: z.string().uuid("Invalid group ID"),
  }),
});

export const changeRoleSchema = z.object({
  params: z.object({
    tribeId: z.string().uuid("Invalid tribe ID"),
    userId: z.string().uuid("Invalid user ID"),
  }),
  body: z.object({
    role: z.enum(["admin", "moderator", "member"]),
  }),
});
