import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const migrationFiles = [
  "001_gig_marketplace_schema.sql",
  "002_gig_marketplace_rpc.sql",
  "003_gig_marketplace_rls.sql",
  "004_gig_marketplace_realtime.sql",
  "005_user_profiles_personal_details.sql",
];

function resolveConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const password = process.env.SUPABASE_DB_PASSWORD;
  const host = process.env.SUPABASE_DB_HOST;
  if (!password || !host) {
    throw new Error(
      "Missing DATABASE_URL (or SUPABASE_DB_PASSWORD + SUPABASE_DB_HOST) in environment.",
    );
  }

  return `postgresql://postgres:${encodeURIComponent(password)}@${host}:5432/postgres`;
}

async function run() {
  const connectionString = resolveConnectionString();
  const migrationsDir = path.resolve(process.cwd(), "migrations");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to Postgres.");

  try {
    for (const file of migrationFiles) {
      const fullPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(fullPath, "utf8");
      process.stdout.write(`Applying ${file} ... `);
      await client.query(sql);
      console.log("OK");
    }

    const verify = await client.query(`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'user_profiles'
        and column_name in (
          'first_name','last_name','phone','email','date_of_birth','gender',
          'address_line1','address_line2','city','state','postal_code','linkedin_url','portfolio_url'
        )
      order by column_name;
    `);

    console.log("Verified columns:", verify.rows.map((r: { column_name: string }) => r.column_name).join(", "));
    console.log("Migration run completed.");
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error("Migration failed:", error?.message || error);
  process.exitCode = 1;
});
