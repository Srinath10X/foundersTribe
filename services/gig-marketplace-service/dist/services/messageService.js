import { decodeCursor, encodeCursor } from "../utils/cursor.js";
import { mapSupabaseError } from "./dbErrorMap.js";
export async function createMessage(db, contractId, senderId, payload) {
    try {
        const { data, error } = await db.rpc("create_contract_message_safe", {
            p_contract_id: contractId,
            p_user_id: senderId,
            p_message_type: payload.message_type,
            p_body: payload.body ?? null,
            p_file_url: payload.file_url ?? null,
            p_metadata: payload.metadata ?? {},
        });
        if (error)
            throw error;
        const message = Array.isArray(data) ? data[0] : data;
        if (!message) {
            throw new Error("Message create RPC returned no row");
        }
        return message;
    }
    catch (error) {
        throw mapSupabaseError(error, "Failed to create message");
    }
}
export async function listMessages(db, contractId, userId, query) {
    const limit = Math.min(Number(query.limit || 50), 100);
    const cursor = decodeCursor(query.cursor);
    try {
        const { data, error } = await db.rpc("list_contract_messages_safe", {
            p_contract_id: contractId,
            p_user_id: userId,
            p_limit: limit,
            p_cursor_created_at: cursor?.createdAt ?? null,
            p_cursor_id: cursor?.id ?? null,
        });
        if (error)
            throw error;
        const rows = data || [];
        const hasMore = rows.length > limit;
        const items = hasMore ? rows.slice(0, limit) : rows;
        const nextCursor = hasMore
            ? encodeCursor(items[items.length - 1].created_at, items[items.length - 1].id)
            : null;
        return { items, next_cursor: nextCursor };
    }
    catch (error) {
        throw mapSupabaseError(error, "Failed to list messages");
    }
}
export async function markMessagesRead(db, contractId, userId) {
    try {
        const { error } = await db.rpc("mark_contract_messages_read_safe", {
            p_contract_id: contractId,
            p_user_id: userId,
        });
        if (error)
            throw error;
        return { success: true };
    }
    catch (error) {
        throw mapSupabaseError(error, "Failed to mark messages read");
    }
}
