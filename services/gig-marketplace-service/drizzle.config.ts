import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  console.warn("[drizzle] DATABASE_URL is not set. drizzle-kit commands will fail until it is provided.");
}

export default defineConfig({
  out: "./migrations/drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
  strict: true,
  verbose: true,
});
