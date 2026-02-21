# Testing Strategy

## SQL Tests
```sql
-- Setup fixtures and capture IDs first.
select public.accept_proposal(:proposal_id);
select public.mark_contract_complete(:contract_id);
select public.approve_contract(:contract_id);
```

## RLS Tests
```sql
set role authenticated;
select set_config('request.jwt.claim.sub', :founder_uuid, true);
select * from public.proposals where gig_id = :gig_id;

select set_config('request.jwt.claim.sub', :stranger_uuid, true);
select * from public.contracts where id = :contract_id;
```

## Node Integration Test Outline
1. Seed founder + freelancer users.
2. Founder creates gig.
3. Freelancer submits proposal.
4. Founder accepts proposal via RPC.
5. Exchange messages.
6. Freelancer completes contract.
7. Founder approves contract.
8. Both users submit rating.
9. Assert notification rows and unread counts.

## Postman Checklist
1. Verify unauthorized requests return `401`.
2. Verify duplicate proposal returns `409`.
3. Verify non-owner proposal acceptance returns `403`.
4. Verify completed-only rating logic returns `422` if active.
5. Verify cursor pagination stability across pages.
6. Verify realtime events appear for message insert and notifications.
