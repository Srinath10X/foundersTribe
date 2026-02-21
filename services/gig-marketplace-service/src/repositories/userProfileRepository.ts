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
}
