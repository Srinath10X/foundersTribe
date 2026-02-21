import { MessageRepository } from "../repositories/messageRepository.js";
import { decodeCursor, encodeCursor } from "../utils/cursor.js";
import { mapSupabaseError } from "./dbErrorMap.js";
import { AppError } from "../utils/AppError.js";
async function ensureCanChat(db, contractId) {
    const { data: contract, error } = await db
        .from("contracts")
        .select("id, status")
        .eq("id", contractId)
        .maybeSingle();
    if (error) {
        throw mapSupabaseError(error, "Failed to validate contract access");
    }
    if (!contract) {
        throw new AppError("Contract not found or access denied", 404, "not_found");
    }
    if (!["active", "completed"].includes(contract.status)) {
        throw new AppError("Messaging is disabled for this contract state", 422, "validation_error");
    }
}
export async function createMessage(db, contractId, senderId, payload) {
    try {
        await ensureCanChat(db, contractId);
        const repo = new MessageRepository(db);
        const message = await repo.insertMessage({
            ...payload,
            contract_id: contractId,
            sender_id: senderId,
        });
        return message;
    }
    catch (error) {
        throw mapSupabaseError(error, "Failed to create message");
    }
}
export async function listMessages(db, contractId, query) {
    await ensureCanChat(db, contractId);
    const repo = new MessageRepository(db);
    const limit = Math.min(Number(query.limit || 50), 100);
    const cursor = decodeCursor(query.cursor);
    const rows = await repo.listMessages(contractId, limit, cursor);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
        ? encodeCursor(items[items.length - 1].created_at, items[items.length - 1].id)
        : null;
    return { items, next_cursor: nextCursor };
}
export async function markMessagesRead(db, contractId, userId) {
    try {
        await ensureCanChat(db, contractId);
        const repo = new MessageRepository(db);
        await repo.markRead(contractId, userId);
        return { success: true };
    }
    catch (error) {
        throw mapSupabaseError(error, "Failed to mark messages read");
    }
}
