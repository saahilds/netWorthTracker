# Plaid backend architecture (single-user first, multi-user ready)

This implementation uses:

- Auth.js (Google OAuth) + Prisma adapter
- Postgres + Prisma schema
- Plaid Link + public token exchange
- Sync pipeline (initial connect, manual refresh, webhook, scheduled endpoint)

## Core tables

- `User`, `Account`, `Session`, `VerificationToken` (Auth.js)
- `PlaidItem` (encrypted access token + cursor + status)
- `PlaidAccount` (normalized account metadata + balances + support status)
- `PlaidHolding` (investment holdings for supported accounts)
- `PlaidTransaction` (max history via `transactions/sync`)
- `NetWorthSnapshot` (time-series basis for trend chart)
- `SyncRun` (run log for sync observability)

## Sync triggers

- **Initial connect**: after public token exchange (`INITIAL_CONNECT`)
- **Manual refresh**: `POST /api/plaid/sync/manual`
- **Webhook**: `POST /api/plaid/webhook`
- **Scheduled**: `POST /api/plaid/sync/scheduled` (free endpoint pattern; add your own cron caller)

## Unsupported institutions

UI includes explicit placeholders for institutions/connectors not yet supported in this phase. The backend also stores account-level support flags (`isSupported`, `unsupportedReason`) for partially-supported Plaid items.

## Security notes

- Plaid access tokens are encrypted at rest (`APP_ENCRYPTION_KEY`)
- OAuth secrets and Plaid credentials are env-only
- Scheduled sync endpoint can be gated via `SYNC_JOB_SECRET`
