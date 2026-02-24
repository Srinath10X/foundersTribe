import { z } from "zod";
import { cursorLimitQuery, gigStatusEnum, uuidSchema } from "./common.js";

const baseGigBody = z.object({
  title: z.string().min(10).max(120),
  description: z.string().min(30).max(5000),
  budget_type: z.enum(["fixed", "hourly"]),
  budget_min: z.number().nonnegative(),
  budget_max: z.number().nonnegative(),
  experience_level: z.enum(["junior", "mid", "senior"]),
  startup_stage: z.enum(["idea", "mvp", "revenue", "funded"]).optional(),
  is_remote: z.boolean().optional(),
  location_text: z.string().max(120).optional(),
  status: gigStatusEnum.optional(),
  tags: z.array(z.string()).max(10).optional(),
});

const createGigBody = baseGigBody.refine((data) => data.budget_max >= data.budget_min, {
  message: "budget_max must be >= budget_min",
  path: ["budget_max"],
});

const patchGigBody = baseGigBody.partial();

export const createGigSchema = z.object({
  body: createGigBody,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateGigSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: patchGigBody,
  query: z.object({}).optional(),
});

export const getGigSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const deleteGigSchema = getGigSchema;

export const listGigsSchema = z.object({
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  query: cursorLimitQuery.extend({
    status: gigStatusEnum.optional(),
    tag: z.string().optional(),
    budget_type: z.enum(["fixed", "hourly"]).optional(),
    budget_min: z.string().optional(),
    budget_max: z.string().optional(),
    experience_level: z.enum(["junior", "mid", "senior"]).optional(),
    startup_stage: z.enum(["idea", "mvp", "revenue", "funded"]).optional(),
  }),
});
