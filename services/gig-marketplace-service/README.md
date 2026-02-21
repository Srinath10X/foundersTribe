# gig-marketplace-service

Express + Supabase-backed microservice for FoundersTribe Gig Marketplace.

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

## Base URL
- `http://localhost:3005/api`

## Health
- `GET /api/health`

## Supabase Runtime
This service runtime uses your existing Supabase project via:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

## Migrations
Apply SQL files in `migrations/` sequentially in your Supabase SQL editor or migration pipeline.

Order:
1. `001_gig_marketplace_schema.sql`
2. `002_gig_marketplace_rpc.sql`
3. `003_gig_marketplace_rls.sql`
4. `004_gig_marketplace_realtime.sql`
5. `005_user_profiles_personal_details.sql`

## Drizzle
Drizzle is added for schema/migration workflow support.
- Schema file: `src/db/schema.ts`
- Config file: `drizzle.config.ts`
- Generate migration SQL: `npm run db:drizzle:generate`

Note: Drizzle CLI commands need `DATABASE_URL`; the running API service does not.
