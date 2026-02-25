import { supabaseAdmin } from "../config/supabase.js";
import { RatingRepository } from "../repositories/ratingRepository.js";
import { mapSupabaseError } from "./dbErrorMap.js";
export async function createRating(db, contractId, reviewerId, payload) {
    try {
        const repo = new RatingRepository(db);
        return await repo.createRating({
            ...payload,
            contract_id: contractId,
            reviewer_id: reviewerId,
        });
    }
    catch (error) {
        throw mapSupabaseError(error, "Failed to create rating");
    }
}
export async function getMyRatingForContract(db, contractId, reviewerId) {
    try {
        const repo = new RatingRepository(db);
        return await repo.getByContractAndReviewer(contractId, reviewerId);
    }
    catch (error) {
        throw mapSupabaseError(error, "Failed to fetch review status");
    }
}
export async function listTestimonialsForUser(revieweeId, query) {
    try {
        const limit = Math.min(Number(query?.limit || 12), 30);
        const repo = new RatingRepository(supabaseAdmin);
        const rows = (await repo.listTestimonials(revieweeId, limit));
        if (!rows.length)
            return { items: [] };
        const reviewerIds = [...new Set(rows.map((row) => row.reviewer_id).filter(Boolean))];
        const contractIds = [...new Set(rows.map((row) => row.contract_id).filter(Boolean))];
        const [reviewersRes, contractsRes] = await Promise.all([
            reviewerIds.length
                ? supabaseAdmin
                    .from("user_profiles")
                    .select("id, full_name, handle, avatar_url, role")
                    .in("id", reviewerIds)
                : Promise.resolve({ data: [], error: null }),
            contractIds.length
                ? supabaseAdmin
                    .from("contracts")
                    .select("id, gig_id")
                    .in("id", contractIds)
                : Promise.resolve({ data: [], error: null }),
        ]);
        if (reviewersRes.error)
            throw reviewersRes.error;
        if (contractsRes.error)
            throw contractsRes.error;
        const gigIds = [
            ...new Set((contractsRes.data || []).map((row) => row.gig_id).filter(Boolean)),
        ];
        const gigsRes = gigIds.length
            ? await supabaseAdmin.from("gigs").select("id, title").in("id", gigIds)
            : { data: [], error: null };
        if (gigsRes.error)
            throw gigsRes.error;
        const reviewerById = new Map((reviewersRes.data || []).map((row) => [row.id, row]));
        const contractById = new Map((contractsRes.data || []).map((row) => [row.id, row]));
        const gigById = new Map((gigsRes.data || []).map((row) => [row.id, row]));
        const items = rows.map((row) => {
            const contract = contractById.get(row.contract_id);
            const gig = contract?.gig_id ? gigById.get(contract.gig_id) : null;
            return {
                ...row,
                reviewer: reviewerById.get(row.reviewer_id) || null,
                contract: contract
                    ? {
                        id: contract.id,
                        gig: gig ? { id: gig.id, title: gig.title } : null,
                    }
                    : null,
            };
        });
        return { items };
    }
    catch (error) {
        throw mapSupabaseError(error, "Failed to fetch testimonials");
    }
}
