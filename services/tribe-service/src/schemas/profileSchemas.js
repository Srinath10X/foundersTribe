import { z } from "zod";

const previousWorkItem = z.object({
  company: z.string().max(100).default(""),
  role: z.string().max(100).default(""),
  duration: z.string().max(50).default(""),
});

const socialLinkItem = z.object({
  platform: z.string().max(50).default(""),
  url: z.string().url("Invalid URL"),
  label: z.string().max(50).default(""),
});

export const updateProfileSchema = z.object({
  body: z.object({
    display_name: z.string().min(1).max(50).optional(),
    bio: z.string().max(500).nullable().optional(),
    photo_url: z
      .string()
      .refine(
        (value) => {
          if (!value) return true;
          if (/^https?:\/\//i.test(value)) return true;
          return /^profiles\/[0-9a-fA-F-]+\/[^/]+$/.test(value);
        },
        {
          message: "Invalid photo URL/path",
        },
      )
      .nullable()
      .optional(),
    linkedin_url: z.string().url().nullable().optional(),
    business_idea: z.string().max(2000).nullable().optional(),
    business_ideas: z.array(z.string().max(2000)).max(20).optional(),
    idea_video_url: z.string().url().nullable().optional(),
    user_type: z.enum(["founder", "freelancer", "both"]).nullable().optional(),
    contact: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    rating: z.number().nullable().optional(),
    completed_gigs: z.array(z.any()).nullable().optional(),
    role: z.string().nullable().optional(),
    previous_works: z.array(previousWorkItem).max(20).optional(),
    social_links: z.array(socialLinkItem).max(10).optional(),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid("Invalid user ID"),
  }),
});
