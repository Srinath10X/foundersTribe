import { SupabaseClient } from "@supabase/supabase-js";

export class GigRepository {
  db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.db = db;
  }

  async createGig(payload: Record<string, any>) {
    const { data, error } = await this.db.from("gigs").insert(payload).select("*").single();
    if (error) throw error;
    return data;
  }

  async getGigById(id: string) {
    const { data, error } = await this.db
      .from("gigs")
      .select("*, gig_tags(tag_id, tags(id, slug, label)), founder:user_profiles!gigs_founder_id_fkey(id, full_name, avatar_url, handle)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async updateGig(id: string, patch: Record<string, any>) {
    const { data, error } = await this.db.from("gigs").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return data;
  }

  async deleteGig(id: string) {
    const { error } = await this.db.from("gigs").delete().eq("id", id);
    if (error) throw error;
  }

  async getFreelancerStats(userId: string) {
    // Count active projects (gigs where this user is the freelancer and status is in_progress)
    const { count: activeProjects, error: activeErr } = await this.db
      .from("contracts")
      .select("*", { count: "exact", head: true })
      .eq("freelancer_id", userId)
      .eq("status", "active");
    if (activeErr) throw activeErr;

    // Sum earnings from completed contracts this month.
    // contracts table does not have agreed_amount; derive amount from linked proposals.
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: completedContracts, error: completedErr } = await this.db
      .from("contracts")
      .select("proposals(proposed_amount)")
      .eq("freelancer_id", userId)
      .eq("status", "completed")
      .gte("updated_at", startOfMonth.toISOString());
    if (completedErr) throw completedErr;

    const earningsMtd = (completedContracts || []).reduce(
      (sum: number, c: any) => sum + (Number(c.proposals?.proposed_amount) || 0),
      0,
    );

    return {
      earnings_mtd: earningsMtd,
      active_projects: activeProjects || 0,
      earnings_growth_pct: 0,
    };
  }

  async addTagsToGig(gigId: string, tagLabels: string[]) {
    if (!tagLabels || tagLabels.length === 0) return;

    // Convert to lowercase slugs
    const slugs = tagLabels.map((l) => l.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));

    // Upsert tags to ensure they exist
    for (let i = 0; i < slugs.length; i++) {
      const { error } = await this.db.from("tags").upsert({ slug: slugs[i], label: tagLabels[i] }, { onConflict: "slug" });
      if (error) console.error("Error upserting tag:", error);
    }

    // Get the tag IDs
    const { data: dbTags } = await this.db.from("tags").select("id, slug").in("slug", slugs);
    if (!dbTags || dbTags.length === 0) return;

    // Replace existing tags for this gig
    await this.db.from("gig_tags").delete().eq("gig_id", gigId);

    const gigTags = dbTags.map((t) => ({ gig_id: gigId, tag_id: t.id }));
    const { error: insertErr } = await this.db.from("gig_tags").insert(gigTags);
    if (insertErr) throw insertErr;
  }

  async listGigs(filters: Record<string, any>, limit: number, cursorParts: { createdAt: string, id: string } | null) {
    if (filters.tag) {
      const tagSlugs = String(filters.tag)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (tagSlugs.length > 0) {
        const { data: taggedRows, error: tagError } = await this.db
          .from("gig_tags")
          .select("gig_id, tags!inner(slug)")
          .in("tags.slug", tagSlugs);

        if (tagError) throw tagError;
        const taggedGigIds = [...new Set((taggedRows || []).map((r: any) => r.gig_id))];
        if (taggedGigIds.length === 0) {
          return { rows: [], count: 0 };
        }
        filters.gig_ids = taggedGigIds;
      }
    }

    let query = this.db
      .from("gigs")
      .select("id, founder_id, title, description, budget_type, budget_min, budget_max, experience_level, startup_stage, status, proposals_count, is_remote, location_text, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.budget_type) query = query.eq("budget_type", filters.budget_type);
    if (filters.experience_level) query = query.eq("experience_level", filters.experience_level);
    if (filters.startup_stage) query = query.eq("startup_stage", filters.startup_stage);
    if (filters.budget_min) query = query.gte("budget_min", Number(filters.budget_min));
    if (filters.budget_max) query = query.lte("budget_max", Number(filters.budget_max));
    if (filters.gig_ids) query = query.in("id", filters.gig_ids);
    if (filters.founder_id) query = query.eq("founder_id", filters.founder_id);

    if (cursorParts) {
      query = query.or(
        `created_at.lt.${cursorParts.createdAt},and(created_at.eq.${cursorParts.createdAt},id.lt.${cursorParts.id})`,
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: data || [], count: count || 0 };
  }
}
