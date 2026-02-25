import { z } from "zod";
import { cursorLimitQuery, uuidSchema } from "./common.js";
export const postTypeEnum = z.enum(["work_update", "showcase", "milestone", "hiring", "insight"]);
// --- Create post ---
const createPostBody = z.object({
    content: z.string().min(1).max(5000),
    post_type: postTypeEnum.optional().default("work_update"),
    images: z.array(z.string().url()).max(10).optional().default([]),
    tags: z.array(z.string().max(50)).max(10).optional().default([]),
});
export const createPostSchema = z.object({
    body: createPostBody,
    params: z.object({}).optional(),
    query: z.object({}).optional(),
});
// --- List feed ---
export const listFeedSchema = z.object({
    params: z.object({}).optional(),
    body: z.object({}).optional(),
    query: cursorLimitQuery.extend({
        post_type: postTypeEnum.optional(),
        author_id: z.string().uuid().optional(),
    }),
});
// --- Get / Delete single post ---
export const getPostSchema = z.object({
    params: z.object({ id: uuidSchema }),
    body: z.object({}).optional(),
    query: z.object({}).optional(),
});
export const deletePostSchema = getPostSchema;
// --- Like / Unlike ---
export const likePostSchema = z.object({
    params: z.object({ id: uuidSchema }),
    body: z.object({}).optional(),
    query: z.object({}).optional(),
});
// --- Comments ---
const createCommentBody = z.object({
    content: z.string().min(1).max(2000),
});
export const createCommentSchema = z.object({
    params: z.object({ id: uuidSchema }),
    body: createCommentBody,
    query: z.object({}).optional(),
});
export const listCommentsSchema = z.object({
    params: z.object({ id: uuidSchema }),
    body: z.object({}).optional(),
    query: cursorLimitQuery,
});
