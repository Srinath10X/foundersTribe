export class RatingRepository {
  constructor(db) {
    this.db = db;
  }

  async createRating(payload) {
    const { data, error } = await this.db.from("ratings").insert(payload).select("*").single();
    if (error) throw error;
    return data;
  }
}
