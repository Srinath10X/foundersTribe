import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class MatchRepository {
  async getMatchBetween(userA, userB) {
    const [minId, maxId] = userA < userB ? [userA, userB] : [userB, userA];
    const { data, error } = await supabase
      .from("user_matches")
      .select("*")
      .eq("user1_id", minId)
      .eq("user2_id", maxId)
      .single();
    if (error) {
      return null;
    }
    return data;
  }

  async createMatch(userA, userB, compatibility) {
    const [minId, maxId] = userA < userB ? [userA, userB] : [userB, userA];
    const payload = {
      user1_id: minId,
      user2_id: maxId,
      compatibility_score: compatibility.score,
      compatibility_breakdown: compatibility.breakdown,
      commitment_aligned: compatibility.commitmentAligned,
      role_complement: compatibility.roleComplement,
      stage_aligned: compatibility.stageAligned,
      skill_overlap_score: compatibility.skillScore,
      industry_overlap_count: compatibility.industryOverlap,
      status: "active",
    };
    const { data, error } = await supabase
      .from("user_matches")
      .insert(payload)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") {
        const existing = await this.getMatchBetween(userA, userB);
        if (existing) return existing;
      }
      logger.error({ error }, "MatchRepository.createMatch failed");
      throw new Error("Database error creating match");
    }
    return data;
  }

  async listMatchesForUser(userId, limit = 50, cursor) {
    let query = supabase
      .from("user_matches")
      .select("*")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq("status", "active")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (cursor) {
      query = query.lt("created_at", cursor);
    }
    const { data, error } = await query;
    if (error) {
      logger.error({ error, userId }, "MatchRepository.listMatchesForUser failed");
      throw new Error("Database error listing matches");
    }
    return data || [];
  }

  async updateMatchLastMessage(matchId, timestamp) {
    const { error } = await supabase
      .from("user_matches")
      .update({ last_message_at: timestamp.toISOString() })
      .eq("id", matchId);
    if (error) {
      logger.error({ error, matchId }, "MatchRepository.updateMatchLastMessage failed");
    }
  }

  async setReadPointer(matchId, userId, messageId) {
    const { data: match, error } = await supabase
      .from("user_matches")
      .select("user1_id, user2_id")
      .eq("id", matchId)
      .single();
    if (error || !match) {
      logger.error({ error, matchId }, "MatchRepository.setReadPointer match fetch failed");
      throw new Error("Match not found");
    }
    const field =
      userId === match.user1_id ? "user1_last_read_message_id" : "user2_last_read_message_id";
    const { error: updateError } = await supabase
      .from("user_matches")
      .update({ [field]: messageId })
      .eq("id", matchId);
    if (updateError) {
      logger.error({ updateError, matchId }, "MatchRepository.setReadPointer update failed");
    }
  }

  async unmatch(matchId, actorId) {
    const { data: match, error } = await supabase
      .from("user_matches")
      .update({
        status: "unmatched",
        unmatched_by: actorId,
        unmatched_at: new Date().toISOString(),
      })
      .eq("id", matchId)
      .select("*")
      .single();
    if (error) {
      logger.error({ error, matchId }, "MatchRepository.unmatch failed");
      throw new Error("Database error unmatching");
    }
    return match;
  }

  async getById(matchId) {
    const { data, error } = await supabase
      .from("user_matches")
      .select("*")
      .eq("id", matchId)
      .single();
    if (error) {
      return null;
    }
    return data;
  }
}

export const matchRepository = new MatchRepository();

