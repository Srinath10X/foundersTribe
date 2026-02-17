import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export async function createRedisAdapter() {
  const pubClient = createClient({ url: env.REDIS_URL });
  const subClient = pubClient.duplicate();

  pubClient.on("error", (err) => logger.error({ err }, "Redis pub error"));
  subClient.on("error", (err) => logger.error({ err }, "Redis sub error"));

  await pubClient.connect();
  await subClient.connect();

  return createAdapter(pubClient, subClient);
}

