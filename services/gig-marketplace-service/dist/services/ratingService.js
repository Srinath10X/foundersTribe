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
