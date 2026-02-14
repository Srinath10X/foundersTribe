import { logger } from '../utils/logger.js';

const gracePeriods = new Map();
const GRACE_PERIOD_MS = 30_000; 

function makeKey(userId, roomId) {
    return `${userId}:${roomId}`;
}

export function startGracePeriod(userId, roomId, onExpired) {
    const key = makeKey(userId, roomId);
    clearGracePeriod(userId, roomId);

    logger.info({ userId, roomId }, `Grace period started (${GRACE_PERIOD_MS / 1000}s)`);

    const timeout = setTimeout(() => {
        gracePeriods.delete(key);
        logger.info({ userId, roomId }, 'Grace period expired — removing participant');
        onExpired();
    }, GRACE_PERIOD_MS);

    gracePeriods.set(key, timeout);
}

export function clearGracePeriod(userId, roomId) {
    const key = makeKey(userId, roomId);
    const timeout = gracePeriods.get(key);

    if (timeout) {
        clearTimeout(timeout);
        gracePeriods.delete(key);
        logger.info({ userId, roomId }, 'Grace period cancelled — user reconnected');
        return true;
    }

    return false;
}

export function hasGracePeriod(userId, roomId) {
    return gracePeriods.has(makeKey(userId, roomId));
}

export function clearAllGracePeriods() {
    for (const [key, timeout] of gracePeriods) {
        clearTimeout(timeout);
    }
    gracePeriods.clear();
}
