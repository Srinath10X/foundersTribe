import { z } from "zod";
import { uuidSchema } from "./common.js";
export const createRatingSchema = z.object({
    params: z.object({ id: uuidSchema }),
    body: z.object({
        reviewee_id: uuidSchema,
        score: z.number().int().min(1).max(5),
        review_text: z.string().max(2000).optional(),
    }),
    query: z.object({}).optional(),
});
export const getMyRatingSchema = z.object({
    params: z.object({ id: uuidSchema }),
    body: z.object({}).optional(),
    query: z.object({}).optional(),
});
