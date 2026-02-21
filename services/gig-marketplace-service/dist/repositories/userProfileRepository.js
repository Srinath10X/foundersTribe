export class UserProfileRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async getById(userId) {
        const { data, error } = await this.db
            .from("user_profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();
        if (error)
            throw error;
        return data;
    }
    async upsertProfile(userId, payload) {
        const { data, error } = await this.db
            .from("user_profiles")
            .upsert({ id: userId, ...payload }, { onConflict: "id" })
            .select("*")
            .single();
        if (error)
            throw error;
        return data;
    }
}
