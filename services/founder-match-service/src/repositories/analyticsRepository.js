import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class AnalyticsRepository {
  async trackEvent(userId, eventType, metadata) {
    const { error } = await supabase.from("analytics_logs").insert({
      user_id: userId || null,
      event_type: eventType,
      metadata: metadata || null,
    });
    if (error) {
      logger.error({ error, eventType }, "AnalyticsRepository.trackEvent failed");
    }
  }
}

export const analyticsRepository = new AnalyticsRepository();

