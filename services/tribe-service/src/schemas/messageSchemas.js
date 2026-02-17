import { z } from "zod";

export const sendMessageSchema = z.object({
  params: z.object({
    groupId: z.string().uuid("Invalid group ID"),
  }),
  body: z.object({
    content: z.string().max(10000).optional(),
    type: z.enum(["text", "image", "video", "audio", "file"]).optional().default("text"),
    media_url: z.string().url().optional(),
    media_metadata: z.object({
      width: z.number().optional(),
      height: z.number().optional(),
      duration: z.number().optional(),
      mime_type: z.string().optional(),
      size_bytes: z.number().optional(),
    }).optional(),
    reply_to_id: z.string().uuid().optional(),
  }).refine(
    (data) => data.content || data.media_url,
    { message: "Either content or media_url is required" },
  ),
});

export const editMessageSchema = z.object({
  params: z.object({
    groupId: z.string().uuid("Invalid group ID"),
    messageId: z.string().uuid("Invalid message ID"),
  }),
  body: z.object({
    content: z.string().min(1).max(10000),
  }),
});

export const messageIdParamSchema = z.object({
  params: z.object({
    groupId: z.string().uuid("Invalid group ID"),
    messageId: z.string().uuid("Invalid message ID"),
  }),
});

export const messagesQuerySchema = z.object({
  query: z.object({
    cursor: z.string().datetime().optional(),
    limit: z.coerce.number().min(1).max(100).optional().default(50),
  }),
  params: z.object({
    groupId: z.string().uuid("Invalid group ID"),
  }),
});

export const reactionSchema = z.object({
  params: z.object({
    groupId: z.string().uuid("Invalid group ID"),
    messageId: z.string().uuid("Invalid message ID"),
  }),
  body: z.object({
    emoji: z.string().min(1).max(20),
  }),
});
