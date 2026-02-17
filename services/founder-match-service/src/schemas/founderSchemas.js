import { z } from "zod";

export const upsertProfileSchema = z.object({
  body: z.object({
    role: z.enum(["tech", "business", "design", "growth"]),
    looking_for: z.enum(["tech", "business", "either"]),
    stage: z.enum(["idea", "mvp", "revenue"]),
    commitment: z.enum(["full_time", "part_time", "exploring"]),
    industry_tags: z.array(z.string()).min(1),
    skills: z.array(z.string()).min(1),
    pitch_short: z.string().min(10).max(200),
    location: z.string().max(200).optional(),
    projects_built: z.number().int().min(0).max(100).optional(),
    verified: z.boolean().optional(),
  }),
});

export const publicProfileQuerySchema = z.object({
  params: z.object({
    userId: z.string().uuid(),
  }),
  query: z.object({
    includeCompatibility: z
      .string()
      .optional()
      .transform((v) => v === "true"),
  }),
  body: z.object({}).optional(),
});

