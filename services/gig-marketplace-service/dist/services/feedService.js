import { FeedRepository } from "../repositories/feedRepository.js";
import { decodeCursor, encodeCursor } from "../utils/cursor.js";
import { AppError } from "../utils/AppError.js";
import { mapSupabaseError } from "./dbErrorMap.js";
export async function createPost(db, authorId, payload, userMeta) {
    try {
        const repo = new FeedRepository(db);
        // Ensure user_profiles row exists with full_name & avatar_url populated.
        // Check the existing row first so we never overwrite user-set values.
        const { data: existing } = await db
            .from("user_profiles")
            .select("id, full_name, avatar_url")
            .eq("id", authorId)
            .maybeSingle();
        if (!existing) {
            // No profile yet — create one with auth metadata
            await db.from("user_profiles").insert({
                id: authorId,
                full_name: userMeta?.full_name || null,
                avatar_url: userMeta?.avatar_url || null,
            });
        }
        else {
            // Profile exists but name/avatar may be missing — fill from auth metadata
            const updates = {};
            if (!existing.full_name && userMeta?.full_name)
                updates.full_name = userMeta.full_name;
            if (!existing.avatar_url && userMeta?.avatar_url)
                updates.avatar_url = userMeta.avatar_url;
            if (Object.keys(updates).length > 0) {
                await db.from("user_profiles").update(updates).eq("id", authorId);
            }
        }
        const result = await repo.createPost({
            author_id: authorId,
            content: payload.content,
            post_type: payload.post_type || "work_update",
            images: payload.images || [],
            tags: payload.tags || [],
        });
        return result;
    }
    catch (error) {
        throw mapSupabaseError(error, "Failed to create post");
    }
}
export async function listFeed(db, query, userId) {
    const repo = new FeedRepository(db);
    const limit = Math.min(Number(query.limit || 20), 100);
    const cursor = decodeCursor(query.cursor);
    const { rows } = await repo.listPosts(query, limit, cursor);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    if (items.length > 0) {
        const authorIds = [...new Set(items.map((p) => p.author_id))];
        // Fetch real profile data from the `profiles` table (tribe-service source of truth)
        // and liked status in parallel
        const [{ data: profiles }, { data: likes }] = await Promise.all([
            db
                .from("profiles")
                .select("id, display_name, username, avatar_url, photo_url, bio")
                .in("id", authorIds),
            db
                .from("feed_post_likes")
                .select("post_id")
                .eq("user_id", userId)
                .in("post_id", items.map((p) => p.id)),
        ]);
        const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
        const likedSet = new Set((likes || []).map((l) => l.post_id));
        for (const item of items) {
            item.is_liked = likedSet.has(item.id);
            // Enrich author from `profiles` table, falling back to `user_profiles` join data
            const tribeProfile = profileMap.get(item.author_id);
            if (tribeProfile) {
                item.author = {
                    id: item.author_id,
                    full_name: tribeProfile.display_name || item.author?.full_name || null,
                    avatar_url: tribeProfile.photo_url || tribeProfile.avatar_url || item.author?.avatar_url || null,
                    handle: tribeProfile.username || item.author?.handle || null,
                };
            }
        }
    }
    const nextCursor = hasMore
        ? encodeCursor(items[items.length - 1].created_at, items[items.length - 1].id)
        : null;
    return { items, next_cursor: nextCursor };
}
export async function getPostById(db, id, userId) {
    const repo = new FeedRepository(db);
    const post = await repo.getPostById(id);
    if (!post)
        throw new AppError("Post not found", 404, "not_found");
    // Check if current user liked this post
    const like = await repo.getUserLike(id, userId);
    post.is_liked = !!like;
    // Enrich author from `profiles` table (tribe-service source of truth)
    const { data: tribeProfile } = await db
        .from("profiles")
        .select("id, display_name, username, avatar_url, photo_url")
        .eq("id", post.author_id)
        .maybeSingle();
    if (tribeProfile) {
        post.author = {
            id: post.author_id,
            full_name: tribeProfile.display_name || post.author?.full_name || null,
            avatar_url: tribeProfile.photo_url || tribeProfile.avatar_url || post.author?.avatar_url || null,
            handle: tribeProfile.username || post.author?.handle || null,
        };
    }
    return post;
}
export async function deletePost(db, id, authorId) {
    try {
        const repo = new FeedRepository(db);
        const post = await repo.getPostById(id);
        if (!post)
            throw new AppError("Post not found", 404, "not_found");
        if (post.author_id !== authorId)
            throw new AppError("Unauthorized", 403, "forbidden");
        await repo.deletePost(id);
    }
    catch (error) {
        throw mapSupabaseError(error, "Failed to delete post");
    }
}
export async function likePost(db, postId, userId) {
    try {
        const repo = new FeedRepository(db);
        // Verify post exists
        const post = await repo.getPostById(postId);
        if (!post)
            throw new AppError("Post not found", 404, "not_found");
        // Check if already liked
        const existing = await repo.getUserLike(postId, userId);
        if (existing)
            throw new AppError("Already liked", 409, "conflict");
        await repo.likePost(postId, userId);
        return { liked: true };
    }
    catch (error) {
        throw mapSupabaseError(error, "Failed to like post");
    }
}
export async function unlikePost(db, postId, userId) {
    try {
        const repo = new FeedRepository(db);
        const post = await repo.getPostById(postId);
        if (!post)
            throw new AppError("Post not found", 404, "not_found");
        await repo.unlikePost(postId, userId);
        return { liked: false };
    }
    catch (error) {
        throw mapSupabaseError(error, "Failed to unlike post");
    }
}
export async function createComment(db, postId, userId, payload) {
    try {
        const repo = new FeedRepository(db);
        // Verify post exists
        const post = await repo.getPostById(postId);
        if (!post)
            throw new AppError("Post not found", 404, "not_found");
        const result = await repo.createComment({
            post_id: postId,
            user_id: userId,
            content: payload.content,
        });
        return result;
    }
    catch (error) {
        throw mapSupabaseError(error, "Failed to create comment");
    }
}
export async function listComments(db, postId, query) {
    const repo = new FeedRepository(db);
    const limit = Math.min(Number(query.limit || 20), 100);
    const cursor = decodeCursor(query.cursor);
    // Verify post exists
    const post = await repo.getPostById(postId);
    if (!post)
        throw new AppError("Post not found", 404, "not_found");
    const { rows } = await repo.listComments(postId, limit, cursor);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
        ? encodeCursor(items[items.length - 1].created_at, items[items.length - 1].id)
        : null;
    return { items, next_cursor: nextCursor };
}
