import { SupabaseClient, User } from "@supabase/supabase-js";

declare global {
    namespace Express {
        interface Request {
            db: SupabaseClient;
            user: User;
            accessToken: string;
        }
    }
}
