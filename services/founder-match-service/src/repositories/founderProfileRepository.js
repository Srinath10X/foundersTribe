import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class FounderProfileRepository {
  async upsert(userId, data, completionPct) {
    const { data: profile, error } = await supabase
      .from("founder_profiles")
      .upsert(
        {
          user_id: userId,
          role: data.role,
          looking_for: data.looking_for,
          stage: data.stage,
          commitment: data.commitment,
          industry_tags: data.industry_tags,
          pitch_short: data.pitch_short,
          location: data.location || null,
          projects_built: data.projects_built ?? 0,
          verified: data.verified ?? false,
          profile_completion_pct: completionPct,
          last_active_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();

    if (error) {
      logger.error({ error }, "FounderProfileRepository.upsert failed");
      throw new Error("Database error upserting founder profile");
    }
    return profile;
  }

  async getByUserId(userId) {
    const { data, error } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      logger.error({ error, userId }, "FounderProfileRepository.getByUserId failed");
      return null;
    }
    return data;
  }

  async updateLastActive(userId) {
    const { error } = await supabase
      .from("founder_profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (error) {
      logger.error({ error, userId }, "FounderProfileRepository.updateLastActive failed");
    }
  }

  async isProfileEligibleForSwiping(userId, minCompletion) {
    const { data, error } = await supabase
      .from("founder_profiles")
      .select("profile_completion_pct, swipe_cooldown_until")
      .eq("user_id", userId)
      .single();
    if (error || !data) {
      return { eligible: false, reason: "PROFILE_MISSING" };
    }
    if (data.profile_completion_pct < minCompletion) {
      return { eligible: false, reason: "PROFILE_INCOMPLETE" };
    }
    if (data.swipe_cooldown_until && new Date(data.swipe_cooldown_until) > new Date()) {
      return { eligible: false, reason: "COOLDOWN" };
    }
    return { eligible: true };
  }

  async setSwipeCooldown(userId, until) {
    const { error } = await supabase
      .from("founder_profiles")
      .update({ swipe_cooldown_until: until.toISOString() })
      .eq("user_id", userId);
    if (error) {
      logger.error({ error, userId }, "FounderProfileRepository.setSwipeCooldown failed");
    }
  }

  async flagAbnormalUnmatch(userId) {
    const { error } = await supabase
      .from("founder_profiles")
      .update({ abnormal_unmatch_flag: true })
      .eq("user_id", userId);
    if (error) {
      logger.error({ error, userId }, "FounderProfileRepository.flagAbnormalUnmatch failed");
    }
  }
}

export const founderProfileRepository = new FounderProfileRepository();

