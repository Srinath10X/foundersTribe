import { z } from "zod";
import { cursorLimitQuery, uuidSchema } from "./common.js";
const messageTypeEnum = z.enum(["text", "file", "system"]);
export const createMessageSchema = z.object({
    params: z.object({ id: uuidSchema }),
    body: z.object({
        recipient_id: uuidSchema.optional(),
        message_type: messageTypeEnum,
        body: z.string().min(1).max(5000).optional(),
        file_url: z.string().url().optional(),
        metadata: z.record(z.any()).optional(),
    }).superRefine((value, ctx) => {
        if (value.message_type === "text" && !value.body) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "body required for text message", path: ["body"] });
        }
        if (value.message_type === "file" && !value.file_url) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "file_url required for file message", path: ["file_url"] });
        }
    }),
    query: z.object({}).optional(),
});
export const listMessagesSchema = z.object({
    params: z.object({ id: uuidSchema }),
    body: z.object({}).optional(),
    query: cursorLimitQuery,
});
export const readMessagesSchema = z.object({
    params: z.object({ id: uuidSchema }),
    body: z.object({}).optional(),
    query: z.object({}).optional(),
});
