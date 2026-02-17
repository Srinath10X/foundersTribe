import { z } from "zod";

export const sendMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(2000),
  }),
  params: z.object({
    matchId: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

export const listMessagesSchema = z.object({
  params: z.object({
    matchId: z.string().uuid(),
  }),
  query: z.object({
    cursor: z.string().optional(),
    limit: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : undefined)),
  }),
  body: z.object({}).optional(),
});

export const seenSchema = z.object({
  params: z.object({
    matchId: z.string().uuid(),
  }),
  body: z.object({
    lastMessageId: z.string().uuid().optional(),
  }),
  query: z.object({}).optional(),
});

