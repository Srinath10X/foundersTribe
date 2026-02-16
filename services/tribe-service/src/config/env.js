import dotenv from "dotenv";
dotenv.config();

const requiredEnv = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "SUPABASE_JWT_SECRET",
];

const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("❌ Missing environment variables:", missing);
  process.exit(1);
}

export const env = {
  PORT: process.env.PORT || "3003",
  NODE_ENV: process.env.NODE_ENV || "development",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
};
