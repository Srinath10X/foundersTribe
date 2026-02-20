# Gig Marketplace Service

## 1. Endpoint Contract

### Gigs
- `POST /api/gigs`
  - Body: `title, description, budget_type, budget_min, budget_max, experience_level, startup_stage?, is_remote?, location_text?, status?`
  - Returns: `201 { data: Gig }`
- `GET /api/gigs`
  - Query: `status?, tag?, budget_type?, budget_min?, budget_max?, experience_level?, startup_stage?, cursor?, limit?`
  - Returns: `{ items: Gig[], next_cursor: string | null }`
- `GET /api/gigs/:id`
  - Returns: `{ data: GigWithFounderAndTags }`
- `PATCH /api/gigs/:id`
  - Body: partial fields from create
  - Returns: `{ data: Gig }`
- `DELETE /api/gigs/:id`
  - Returns: `204`

### Proposals
- `POST /api/gigs/:id/proposals`
  - Body: `cover_letter, proposed_amount, estimated_days?`
  - Returns: `201 { data: Proposal }`
- `GET /api/gigs/:id/proposals`
  - Query: `cursor?, limit?`
  - Returns: `{ items: Proposal[], next_cursor }`
- `POST /api/proposals/:id/accept`
  - Returns: `{ data: { contract_id: uuid } }`

### Contracts
- `GET /api/contracts`
  - Query: `status?, cursor?, limit?`
  - Returns: `{ items: Contract[], next_cursor }`
- `GET /api/contracts/:id`
  - Returns: `{ data: ContractWithGigAndUsers }`
- `POST /api/contracts/:id/complete`
  - Returns: `{ data: { success: true } }`
- `POST /api/contracts/:id/approve`
  - Returns: `{ data: { success: true } }`

### Messages
- `POST /api/contracts/:id/messages`
  - Body: `message_type, body?, file_url?, recipient_id?, metadata?`
  - Returns: `201 { data: Message }`
- `GET /api/contracts/:id/messages`
  - Query: `cursor?, limit?`
  - Returns: `{ items: Message[], next_cursor }`
- `POST /api/contracts/:id/messages/read`
  - Returns: `{ data: { success: true } }`

### Ratings
- `POST /api/contracts/:id/rate`
  - Body: `reviewee_id, score, review_text?`
  - Returns: `201 { data: Rating }`

### Notifications
- `GET /api/notifications`
  - Query: `unread=true|false, cursor?, limit?`
  - Returns: `{ items: Notification[], next_cursor }`

## 2. Error Model
- Response shape:
  - `{ error: { code: string, message: string, details: object | null } }`
- Common status codes:
  - `400` bad request
  - `401` unauthorized
  - `403` forbidden
  - `404` not found
  - `409` conflict
  - `422` validation error
  - `500` internal error

## 3. Realtime Pattern

```ts
const channel = supabase
  .channel(`contract:${contractId}`)
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "messages",
    filter: `contract_id=eq.${contractId}`,
  }, (payload) => {
    console.log("new message", payload.new);
  })
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "notifications",
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    console.log("new notification", payload.new);
  })
  .subscribe();
```

## 4. Filtering + Pagination
- Use cursor based on `(created_at,id)`.
- Decode cursor from base64 `created_at|id`.
- Sort descending by `created_at,id` in all listing endpoints.
- Recommended max page size: 100.

## 5. Race Safety
- Duplicate proposal blocked by unique `(gig_id, freelancer_id)`.
- Double contract blocked by unique `(gig_id)` + `accept_proposal` row lock (`FOR UPDATE`).
- Completion race protected by row lock on `contracts` in completion/approval RPCs.

## 6. Deployment Checklist
1. Apply migrations in order:
   - `001_gig_marketplace_schema.sql`
   - `002_gig_marketplace_rpc.sql`
   - `003_gig_marketplace_rls.sql`
   - `004_gig_marketplace_realtime.sql`
2. Deploy edge functions:
   - `accept-proposal`
   - `mark-contract-complete`
   - `approve-contract`
3. Configure env vars:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `CORS_ORIGIN`
4. Run smoke tests for gig lifecycle.

## 7. Test Commands (SQL)

```sql
-- Accept proposal
select public.accept_proposal('00000000-0000-0000-0000-000000000000');

-- Freelancer marks completion
select public.mark_contract_complete('00000000-0000-0000-0000-000000000000');

-- Founder approves
select public.approve_contract('00000000-0000-0000-0000-000000000000');
```

## 8. Integration Testing (Node)
- Test scenario:
  - founder creates gig
  - freelancer creates proposal
  - founder accepts proposal
  - freelancer marks complete
  - founder approves
  - both submit ratings
  - verify notifications and RLS visibility
