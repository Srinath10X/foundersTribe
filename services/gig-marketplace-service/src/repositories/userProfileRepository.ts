import { SupabaseClient } from "@supabase/supabase-js";

export class UserProfileRepository {
  db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.db = db;
  }

  async getById(userId: string) {
    const { data, error } = await this.db
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async upsertProfile(userId: string, payload: Record<string, unknown>) {
    const { data, error } = await this.db
      .from("user_profiles")
      .upsert({ id: userId, ...payload }, { onConflict: "id" })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  async listProfiles(
    limit: number,
    cursorParts: { updatedAt: string; id: string } | null,
    search?: string,
  ) {
    let query = this.db
      .from("user_profiles")
      .select("id, full_name, handle, avatar_url, bio, role, updated_at", { count: "exact" })
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (search) {
      const trimmed = search.trim();
      if (trimmed.length > 0) {
        query = query.or(
          `full_name.ilike.%${trimmed}%,handle.ilike.%${trimmed}%,bio.ilike.%${trimmed}%`,
        );
      }
    }

    if (cursorParts) {
      query = query.or(
        `updated_at.lt.${cursorParts.updatedAt},and(updated_at.eq.${cursorParts.updatedAt},id.lt.${cursorParts.id})`,
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: data || [], count: count || 0 };
  }
}
