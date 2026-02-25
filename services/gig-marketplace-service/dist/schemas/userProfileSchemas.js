import { z } from "zod";
const nullableText = z.string().trim().max(255).nullable().optional();
const upsertProfileBody = z.object({
    handle: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
    full_name: z.string().trim().min(2).max(120).optional(),
    avatar_url: z.string().url().optional().or(z.literal("")),
    bio: z.string().trim().max(2000).optional(),
    role: z.enum(["founder", "freelancer", "both"]).optional(),
    availability: z.enum(["open", "busy", "inactive"]).optional(),
    experience_level: z.enum(["junior", "mid", "senior"]).nullable().optional(),
    startup_stage: z.enum(["idea", "mvp", "revenue", "funded"]).nullable().optional(),
    hourly_rate: z.number().nonnegative().nullable().optional(),
    country: nullableText,
    timezone: nullableText,
    first_name: nullableText,
    last_name: nullableText,
    phone: z.string().trim().max(25).nullable().optional(),
    email: z.string().email().max(255).nullable().optional(),
    date_of_birth: z.string().date().nullable().optional(),
    gender: z.enum(["male", "female", "non_binary", "prefer_not_to_say", "other"]).nullable().optional(),
    address_line1: z.string().trim().max(255).nullable().optional(),
    address_line2: z.string().trim().max(255).nullable().optional(),
    city: nullableText,
    state: nullableText,
    postal_code: z.string().trim().max(30).nullable().optional(),
    linkedin_url: z.string().url().max(255).nullable().optional(),
    portfolio_url: z.string().url().max(255).nullable().optional(),
});
export const upsertUserProfileSchema = z.object({
    params: z.object({}).optional(),
    body: upsertProfileBody,
    query: z.object({}).optional(),
});
export const getUserProfileSchema = z.object({
    params: z.object({}).optional(),
    body: z.object({}).optional(),
    query: z.object({}).optional(),
});
export const getUserTestimonialsSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
    body: z.object({}).optional(),
    query: z.object({
        limit: z.coerce.number().int().positive().max(30).optional(),
    }).optional(),
});
