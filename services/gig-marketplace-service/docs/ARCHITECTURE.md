# Production Architecture

## Realtime
- Subscribe on `messages` by `contract_id` and `notifications` by `user_id`.
- Use Postgres Changes for durable events.
- Use broadcast channel only for ephemeral events (typing, online status).

## Performance and Scale
- Use keyset pagination (`created_at,id`) for all large lists.
- Keep hot path indexes:
  - `gigs(status,created_at desc,id desc)`
  - `proposals(gig_id,status,created_at desc,id desc)`
  - `contracts(founder_id|freelancer_id,created_at desc,id desc)`
  - `messages(contract_id,created_at desc,id desc)`
  - `notifications(user_id,read_at,created_at desc,id desc)`
- Avoid N+1 by joining founder/profile/tag data in one query.
- Keep RPC transactions short and row-lock only target records.
- Use Supabase pooler endpoint for app traffic.

## Security
- Enforce ownership with RLS and `auth.uid()` checks.
- Restrict state transitions to RPC (`accept_proposal`, `mark_contract_complete`, `approve_contract`).
- Never expose `service_role` in mobile/web clients.
- Validate every request body via Zod in service and Edge Function layer.

## Race-Condition Strategy
- Proposal uniqueness: `(gig_id, freelancer_id)` unique key.
- Single contract per gig: `contracts(gig_id)` unique key.
- Proposal acceptance uses `SELECT ... FOR UPDATE` on gig row.
- Completion/approval uses `SELECT ... FOR UPDATE` on contract row.
