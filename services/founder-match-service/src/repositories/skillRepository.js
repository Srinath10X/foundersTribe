import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class SkillRepository {
  async ensureSkillsReturnIds(skillSlugs) {
    if (!skillSlugs.length) return [];
    const { data, error } = await supabase
      .from("skill_catalog")
      .select("*")
      .in("slug", skillSlugs);
    if (error) {
      logger.error({ error }, "SkillRepository.ensureSkillsReturnIds select failed");
      throw new Error("Database error loading skills");
    }
    const existingBySlug = new Map((data || []).map((s) => [s.slug, s]));
    const missing = skillSlugs.filter((slug) => !existingBySlug.has(slug));
    let inserted = [];
    if (missing.length) {
      const rows = missing.map((slug) => ({ slug, name: slug }));
      const { data: insertedRows, error: insertError } = await supabase
        .from("skill_catalog")
        .insert(rows)
        .select("*");
      if (insertError) {
        logger.error({ insertError }, "SkillRepository.ensureSkillsReturnIds insert failed");
        throw new Error("Database error creating skills");
      }
      inserted = insertedRows || [];
    }
    const all = [...(data || []), ...inserted];
    return all.map((s) => s.id);
  }

  async replaceUserSkills(userId, skillIds) {
    const { error: delError } = await supabase
      .from("user_skill_links")
      .delete()
      .eq("user_id", userId);
    if (delError) {
      logger.error({ delError, userId }, "SkillRepository.replaceUserSkills delete failed");
      throw new Error("Database error updating user skills");
    }
    if (!skillIds.length) return;
    const rows = skillIds.map((id) => ({ user_id: userId, skill_id: id }));
    const { error: insError } = await supabase
      .from("user_skill_links")
      .insert(rows);
    if (insError) {
      logger.error({ insError, userId }, "SkillRepository.replaceUserSkills insert failed");
      throw new Error("Database error updating user skills");
    }
  }

  async getTopSkillsForUsers(userIds, limitPerUser = 3) {
    if (!userIds.length) return new Map();
    const { data, error } = await supabase
      .from("user_skill_links")
      .select("user_id, skill:skill_catalog!inner(name)")
      .in("user_id", userIds)
      .limit(limitPerUser);
    if (error) {
      logger.error({ error }, "SkillRepository.getTopSkillsForUsers failed");
      throw new Error("Database error fetching user skills");
    }
    const result = new Map();
    for (const row of data || []) {
      const list = result.get(row.user_id) || [];
      if (list.length < limitPerUser) {
        list.push(row.skill.name);
        result.set(row.user_id, list);
      }
    }
    return result;
  }
}

export const skillRepository = new SkillRepository();

