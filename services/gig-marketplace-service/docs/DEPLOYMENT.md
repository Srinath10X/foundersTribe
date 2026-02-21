# Deployment Plan

## Migration Order
1. `001_gig_marketplace_schema.sql`
2. `002_gig_marketplace_rpc.sql`
3. `003_gig_marketplace_rls.sql`
4. `004_gig_marketplace_realtime.sql`

## Environment Separation
- Use distinct Supabase projects for dev/staging/prod.
- Separate JWT secrets and API keys per environment.
- Separate Edge Function deployments per environment.

## Backup and Recovery
- Enable PITR and daily backups.
- Run restore drill at least quarterly.

## Monitoring
- Alert on:
  - RPC failure rate
  - p95 query latency
  - deadlocks / lock waits
  - replication lag
- Track SQLSTATE spikes (`23505`, `42501`, custom `P0001/P0002`).

## Logging
- Structured JSON logs with request id, user id, endpoint.
- Capture rpc name and db error codes.

## Read Scaling
- Keep writes and RPC on primary.
- Route read-heavy browse/search to read replicas when enabled.
- Use replica lag guard for freshness-sensitive views.
