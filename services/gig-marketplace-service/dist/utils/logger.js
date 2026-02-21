import pino from "pino";
import { env } from "../config/env.js";
export const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport: env.NODE_ENV !== "production"
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:standard",
            },
        }
        : undefined,
});
