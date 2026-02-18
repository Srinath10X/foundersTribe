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
    photo_url: z.string().url().nullable().optional(),
    linkedin_url: z.string().url().nullable().optional(),
    business_idea: z.string().max(2000).nullable().optional(),
    idea_video_url: z.string().url().nullable().optional(),
    previous_works: z.array(previousWorkItem).max(20).optional(),
    social_links: z.array(socialLinkItem).max(10).optional(),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid("Invalid user ID"),
  }),
});
