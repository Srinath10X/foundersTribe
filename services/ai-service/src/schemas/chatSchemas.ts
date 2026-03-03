import { z } from "zod";

export const chatRequestSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message too long (max 2000 characters)"),
  conversation_history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(20, "Too many history messages (max 20)")
    .default([]),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
