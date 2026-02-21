import { z } from "zod";
import { contractStatusEnum, cursorLimitQuery, uuidSchema } from "./common.js";
export const listContractsSchema = z.object({
    params: z.object({}).optional(),
    body: z.object({}).optional(),
    query: cursorLimitQuery.extend({
        status: contractStatusEnum.optional(),
    }),
});
export const contractByIdSchema = z.object({
    params: z.object({ id: uuidSchema }),
    body: z.object({}).optional(),
    query: z.object({}).optional(),
});
export const contractActionSchema = contractByIdSchema;
