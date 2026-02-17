import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class SwipeRepository {
  async createSwipe(swiperId, targetId, type) {
    const { data, error } = await supabase
      .from("swipe_actions")
      .insert({
        swiper_id: swiperId,
        target_id: targetId,
        type,
      })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") {
        const existing = await this.getSwipe(swiperId, targetId);
        if (existing) return existing;
      }
      logger.error({ error }, "SwipeRepository.createSwipe failed");
      throw new Error("Database error creating swipe");
    }
    return data;
  }

  async getSwipe(swiperId, targetId) {
    const { data, error } = await supabase
      .from("swipe_actions")
      .select("*")
      .eq("swiper_id", swiperId)
      .eq("target_id", targetId)
      .single();
    if (error) {
      return null;
    }
    return data;
  }

  async getDailySwipeCount(swiperId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count, error } = await supabase
      .from("swipe_actions")
      .select("*", { count: "exact", head: true })
      .eq("swiper_id", swiperId)
      .gte("created_at", startOfDay.toISOString());
    if (error) {
      logger.error({ error }, "SwipeRepository.getDailySwipeCount failed");
      throw new Error("Database error counting swipes");
    }
    return count || 0;
  }

  async getDailySuperCount(swiperId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count, error } = await supabase
      .from("swipe_actions")
      .select("*", { count: "exact", head: true })
      .eq("swiper_id", swiperId)
      .eq("type", "super")
      .gte("created_at", startOfDay.toISOString());
    if (error) {
      logger.error({ error }, "SwipeRepository.getDailySuperCount failed");
      throw new Error("Database error counting super swipes");
    }
    return count || 0;
  }

  async hasMutualPositiveSwipe(userA, userB) {
    const { data, error } = await supabase
      .from("swipe_actions")
      .select("swiper_id, target_id, type")
      .or(
        `and(swiper_id.eq.${userA},target_id.eq.${userB}),and(swiper_id.eq.${userB},target_id.eq.${userA})`,
      );
    if (error) {
      logger.error({ error, userA, userB }, "SwipeRepository.hasMutualPositiveSwipe failed");
      throw new Error("Database error checking mutual swipe");
    }
    let aToB = null;
    let bToA = null;
    for (const row of data || []) {
      if (row.swiper_id === userA && row.target_id === userB) aToB = row.type;
      if (row.swiper_id === userB && row.target_id === userA) bToA = row.type;
    }
    const positive = (t) => t === "interested" || t === "super";
    return positive(aToB) && positive(bToA);
  }

  async nextCandidateForUser(userId, filters, limit = 1) {
    let query = supabase
      .from("founder_profiles")
      .select("user_id, role, looking_for, stage, commitment, industry_tags, pitch_short, last_active_at, profile_completion_pct, verified, projects_built")
      .neq("user_id", userId)
      .gte("profile_completion_pct", filters.minCompletion)
      .order("last_active_at", { ascending: false })
      .limit(limit);
    if (filters.role) {
      query = query.eq("role", filters.role);
    }
    if (filters.stage) {
      query = query.eq("stage", filters.stage);
    }
    if (filters.commitment) {
      query = query.eq("commitment", filters.commitment);
    }
    if (filters.industry) {
      query = query.contains("industry_tags", [filters.industry]);
    }
    const { data, error } = await query;
    if (error) {
      logger.error({ error }, "SwipeRepository.nextCandidateForUser base query failed");
      throw new Error("Database error fetching candidate");
    }
    if (!data || !data.length) return [];
    const candidateIds = data.map((r) => r.user_id);
    const { data: swipes, error: swipeError } = await supabase
      .from("swipe_actions")
      .select("target_id")
      .eq("swiper_id", userId)
      .in("target_id", candidateIds);
    if (swipeError) {
      logger.error({ swipeError }, "SwipeRepository.nextCandidateForUser swipes failed");
      throw new Error("Database error filtering candidate");
    }
    const swipedSet = new Set((swipes || []).map((s) => s.target_id));
    const { data: matches, error: matchError } = await supabase
      .from("user_matches")
      .select("user1_id, user2_id")
      .or(
        `user1_id.eq.${userId},user2_id.eq.${userId}`,
      );
    if (matchError) {
      logger.error({ matchError }, "SwipeRepository.nextCandidateForUser matches failed");
      throw new Error("Database error filtering candidate matches");
    }
    const matchedSet = new Set();
    for (const m of matches || []) {
      matchedSet.add(m.user1_id === userId ? m.user2_id : m.user1_id);
    }
    const filtered = data.filter(
      (row) => !swipedSet.has(row.user_id) && !matchedSet.has(row.user_id),
    );
    return filtered.slice(0, limit);
  }
}

export const swipeRepository = new SwipeRepository();

