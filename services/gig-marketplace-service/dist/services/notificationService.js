import { NotificationRepository } from "../repositories/notificationRepository.js";
import { decodeCursor, encodeCursor } from "../utils/cursor.js";
export async function listNotifications(db, query) {
    const repo = new NotificationRepository(db);
    const limit = Math.min(Number(query.limit || 20), 100);
    const cursor = decodeCursor(query.cursor);
    const rows = await repo.listNotifications(query.unread === "true", limit, cursor);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
        ? encodeCursor(items[items.length - 1].created_at, items[items.length - 1].id)
        : null;
    return { items, next_cursor: nextCursor };
}
