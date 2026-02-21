import { z } from "zod";
import { cursorLimitQuery } from "./common.js";
export const listNotificationsSchema = z.object({
    params: z.object({}).optional(),
    body: z.object({}).optional(),
    query: cursorLimitQuery.extend({
        unread: z.enum(["true", "false"]).optional(),
    }),
});
