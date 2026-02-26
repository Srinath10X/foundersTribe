import { z } from "zod";
import { cursorLimitQuery, uuidSchema } from "./common.js";

const durationUnitSchema = z.enum(["days", "weeks"]);
const requestStatusSchema = z.enum(["pending", "accepted", "declined", "cancelled"]);
const messageTypeEnum = z.enum(["text", "file", "system"]);

const serviceItemSchema = z.object({
  service_name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  cost_amount: z.number().nonnegative(),
  cost_currency: z.string().trim().min(1).max(8).optional(),
  delivery_time_value: z.number().int().positive().max(365),
  delivery_time_unit: durationUnitSchema,
  is_active: z.boolean().optional(),
});

export const upsertMyServicesSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({
    services: z.array(serviceItemSchema).max(40),
  }),
});

export const listMyServicesSchema = z.object({
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const listFreelancerServicesSchema = z.object({
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  query: cursorLimitQuery.extend({
    q: z.string().trim().max(120).optional(),
    service_name: z.string().trim().max(120).optional(),
    freelancer_id: uuidSchema.optional(),
    min_cost: z.string().optional(),
    max_cost: z.string().optional(),
    max_delivery_days: z.string().optional(),
    sort_by: z.enum(["relevance", "cost_asc", "cost_desc", "time_asc", "time_desc", "newest"]).optional(),
  }),
});

export const getFreelancerServicesByUserSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const createServiceRequestSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({
    freelancer_id: uuidSchema,
    service_id: uuidSchema.optional(),
    message: z.string().trim().max(2000).optional(),
  }),
});

export const listServiceRequestsSchema = z.object({
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  query: z.object({
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: requestStatusSchema.optional(),
  }).optional(),
});

export const getServiceRequestSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const listServiceRequestMessagesSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: z.object({}).optional(),
  query: cursorLimitQuery,
});

export const createServiceRequestMessageSchema = z.object({
  params: z.object({ id: uuidSchema }),
  query: z.object({}).optional(),
  body: z.object({
    message_type: messageTypeEnum,
    body: z.string().min(1).max(5000).optional(),
    file_url: z.string().url().optional(),
    metadata: z.record(z.any()).optional(),
  }).superRefine((value, ctx) => {
    if (value.message_type === "text" && !value.body) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body"],
        message: "body required for text message",
      });
    }
    if (value.message_type === "file" && !value.file_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["file_url"],
        message: "file_url required for file message",
      });
    }
  }),
});

export const markServiceRequestMessagesReadSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateServiceRequestStatusSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});
