import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 3006),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GIG_SERVICE_URL: process.env.GIG_SERVICE_URL || "http://localhost:3005",
};

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY || !env.SUPABASE_ANON_KEY) {
  throw new Error("Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_KEY");
}

if (!env.GROQ_API_KEY) {
  throw new Error("Missing GROQ_API_KEY");
}
