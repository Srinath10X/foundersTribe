import { SupabaseClient } from "@supabase/supabase-js";

export class FeedRepository {
  db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.db = db;
  }

  async createPost(payload: Record<string, any>) {
    const { data, error } = await this.db.from("feed_posts").insert(payload).select("*").single();
    if (error) throw error;
    return data;
  }

  async getPostById(id: string) {
    const { data, error } = await this.db
      .from("feed_posts")
      .select("*, author:user_profiles!feed_posts_author_id_fkey(id, full_name, avatar_url, handle)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async deletePost(id: string) {
    const { error } = await this.db.from("feed_posts").delete().eq("id", id);
    if (error) throw error;
  }

  async listPosts(
    filters: Record<string, any>,
    limit: number,
    cursorParts: { createdAt: string; id: string } | null,
  ) {
    let query = this.db
      .from("feed_posts")
      .select(
        "*, author:user_profiles!feed_posts_author_id_fkey(id, full_name, avatar_url, handle)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (filters.post_type) query = query.eq("post_type", filters.post_type);
    if (filters.author_id) query = query.eq("author_id", filters.author_id);

    if (cursorParts) {
      query = query.or(
        `created_at.lt.${cursorParts.createdAt},and(created_at.eq.${cursorParts.createdAt},id.lt.${cursorParts.id})`,
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: data || [], count: count || 0 };
  }

  // --- Likes ---

  async likePost(postId: string, userId: string) {
    const { data, error } = await this.db
      .from("feed_post_likes")
      .insert({ post_id: postId, user_id: userId })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async unlikePost(postId: string, userId: string) {
    const { error } = await this.db
      .from("feed_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) throw error;
  }

  async getUserLike(postId: string, userId: string) {
    const { data, error } = await this.db
      .from("feed_post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // --- Comments ---

  async createComment(payload: Record<string, any>) {
    const { data, error } = await this.db
      .from("feed_post_comments")
      .insert(payload)
      .select("*, user:user_profiles!feed_post_comments_user_id_fkey(id, full_name, avatar_url, handle)")
      .single();
    if (error) throw error;
    return data;
  }

  async listComments(
    postId: string,
    limit: number,
    cursorParts: { createdAt: string; id: string } | null,
  ) {
    let query = this.db
      .from("feed_post_comments")
      .select(
        "*, user:user_profiles!feed_post_comments_user_id_fkey(id, full_name, avatar_url, handle)",
        { count: "exact" },
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit + 1);

    if (cursorParts) {
      query = query.or(
        `created_at.gt.${cursorParts.createdAt},and(created_at.eq.${cursorParts.createdAt},id.gt.${cursorParts.id})`,
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: data || [], count: count || 0 };
  }
}
