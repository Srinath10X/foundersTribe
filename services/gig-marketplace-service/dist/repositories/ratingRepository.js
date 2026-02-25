export class RatingRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async createRating(payload) {
        const { data, error } = await this.db.from("ratings").insert(payload).select("*").single();
        if (error)
            throw error;
        return data;
    }
    async getByContractAndReviewer(contractId, reviewerId) {
        const { data, error } = await this.db
            .from("ratings")
            .select("id, contract_id, reviewer_id, reviewee_id, score, review_text, created_at, updated_at")
            .eq("contract_id", contractId)
            .eq("reviewer_id", reviewerId)
            .maybeSingle();
        if (error)
            throw error;
        return data;
    }
    async listTestimonials(revieweeId, limit) {
        const { data, error } = await this.db
            .from("ratings")
            .select("id, contract_id, reviewer_id, reviewee_id, score, review_text, created_at")
            .eq("reviewee_id", revieweeId)
            .order("created_at", { ascending: false })
            .limit(limit);
        if (error)
            throw error;
        return data || [];
    }
}
