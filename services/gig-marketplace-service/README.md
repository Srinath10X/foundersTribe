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

## Migrations
Apply SQL files in `migrations/` sequentially in your Supabase SQL editor or migration pipeline.
