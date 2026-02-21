import { SupabaseClient } from "@supabase/supabase-js";

export class RatingRepository {
  db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.db = db;
  }

  async createRating(payload: Record<string, any>) {
    const { data, error } = await this.db.from("ratings").insert(payload).select("*").single();
    if (error) throw error;
    return data;
  }
}
