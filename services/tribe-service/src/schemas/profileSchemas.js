import { z } from "zod";

const previousWorkItem = z.object({
  company: z.string().max(200).default(""),
  role: z.string().max(200).default(""),
  duration: z.string().max(100).default(""),
});

const socialLinkItem = z.object({
  platform: z.string().max(100).default(""),
  url: z.string().min(1, "URL is required"),
  label: z.string().max(100).default(""),
});

export const updateProfileSchema = z.object({
  body: z.object({
    display_name: z.string().min(1).max(100).optional(),
    bio: z.string().max(5000).nullable().optional(),
    photo_url: z
      .string()
      .refine(
        (value) => {
          if (!value) return true;
          // Accept any HTTP(S) URL
          if (/^https?:\/\//i.test(value)) return true;
          // Accept Supabase storage paths like profiles/<uuid>/<filename>
          return /^profiles\/[^/]+\/[^/]+$/.test(value);
        },
        {
          message: "Invalid photo URL/path",
        },
      )
      .nullable()
      .optional(),
    linkedin_url: z.string().nullable().optional(),
    business_idea: z.string().max(5000).nullable().optional(),
    business_ideas: z.array(z.string().max(5000)).max(20).optional(),
    idea_video_url: z.string().nullable().optional(),
    user_type: z.enum(["founder", "freelancer", "both"]).nullable().optional(),
    contact: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    rating: z.number().nullable().optional(),
    completed_gigs: z.array(z.any()).nullable().optional(),
    role: z.string().nullable().optional(),
    previous_works: z.array(previousWorkItem).max(20).optional(),
    social_links: z.array(socialLinkItem).max(10).optional(),
  }).passthrough(),
});

export const userIdParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid("Invalid user ID"),
  }),
});
