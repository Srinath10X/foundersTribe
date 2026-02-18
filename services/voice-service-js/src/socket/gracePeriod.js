import { logger } from "../utils/logger.js";

const GRACE_PERIOD_MS = 30_000;

// In-memory timers keyed by "userId:roomId" — these fire the onExpired callbacks
const localTimers = new Map();

// Redis client reference — set via init()
let redisClient = null;

function makeKey(userId, roomId) {
  return `${userId}:${roomId}`;
}

function redisKey(userId, roomId) {
  return `grace:${userId}:${roomId}`;
}

/**
 * Initialize with a Redis client for cross-instance grace period tracking.
 * If not called, falls back to local-only mode.
 */
export function initGracePeriod(client) {
  redisClient = client;
  logger.info("Grace period system initialized with Redis");
}

export async function startGracePeriod(userId, roomId, onExpired) {
  const key = makeKey(userId, roomId);
  await clearGracePeriod(userId, roomId);

  logger.info(
    { userId, roomId },
    `Grace period started (${GRACE_PERIOD_MS / 1000}s)`,
  );

  // Mark in Redis so other instances can see this grace period exists
  if (redisClient) {
    try {
      await redisClient.set(redisKey(userId, roomId), Date.now().toString(), {
        EX: Math.ceil(GRACE_PERIOD_MS / 1000) + 5, // TTL slightly longer than grace period
      });
    } catch (err) {
      logger.warn({ err, userId, roomId }, "Failed to set grace period in Redis");
    }
  }

  const timeout = setTimeout(async () => {
    localTimers.delete(key);

    // Clean up Redis key
    if (redisClient) {
      try {
        await redisClient.del(redisKey(userId, roomId));
      } catch {
        // ignore
      }
    }

    logger.info(
      { userId, roomId },
      "Grace period expired — removing participant",
    );
    onExpired();
  }, GRACE_PERIOD_MS);

  localTimers.set(key, timeout);
}

export async function clearGracePeriod(userId, roomId) {
  const key = makeKey(userId, roomId);
  const timeout = localTimers.get(key);

  // Clear local timer if present
  if (timeout) {
    clearTimeout(timeout);
    localTimers.delete(key);
    logger.info(
      { userId, roomId },
      "Grace period cancelled — user reconnected (local)",
    );
  }

  // Also clear in Redis so other instances won't consider it active
  if (redisClient) {
    try {
      const deleted = await redisClient.del(redisKey(userId, roomId));
      if (deleted && !timeout) {
        logger.info(
          { userId, roomId },
          "Grace period cancelled — user reconnected (Redis cross-instance)",
        );
      }
    } catch (err) {
      logger.warn({ err, userId, roomId }, "Failed to clear grace period from Redis");
    }
  }

  return !!timeout;
}

export async function hasGracePeriod(userId, roomId) {
  // Check local first
  if (localTimers.has(makeKey(userId, roomId))) return true;

  // Then check Redis for cross-instance
  if (redisClient) {
    try {
      const val = await redisClient.get(redisKey(userId, roomId));
      return val !== null;
    } catch {
      return false;
    }
  }

  return false;
}

export function clearAllGracePeriods() {
  for (const [key, timeout] of localTimers) {
    clearTimeout(timeout);
  }
  localTimers.clear();
}
