import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class ReportRepository {
  async create(data) {
    const { data: row, error } = await supabase
      .from("user_reports")
      .insert({
        reporter_id: data.reporterId,
        reported_id: data.reportedId,
        match_id: data.matchId || null,
        reason: data.reason,
        metadata: data.metadata || null,
      })
      .select()
      .single();
    if (error) {
      logger.error({ error }, "ReportRepository.create failed");
      throw new Error("Database error creating report");
    }
    return row;
  }
}

export const reportRepository = new ReportRepository();

