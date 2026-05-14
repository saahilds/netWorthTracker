# Security and multi-user notes

This scaffold is designed so the app can evolve from single-user to multi-user without rewriting the core model.

## Plaid credential strategy

- Do not store Plaid keys in code.
- Store provider credentials in secrets management for local/dev.
- For multi-user support, model credentials as encrypted records tied to a user and a provider workspace:
  - `provider_credentials.id`
  - `provider_credentials.user_id`
  - `provider_credentials.provider` (e.g. `plaid`)
  - `provider_credentials.encrypted_access_token`
  - `provider_credentials.encrypted_item_id`
  - `provider_credentials.status`

If each user brings their own Plaid account and API key, treat those keys as per-user secrets and isolate all sync jobs by `user_id`.

## Isolation requirements

- Every account, holding, transaction, and snapshot row should include `user_id`.
- Add row-level checks in every query path.
- Never mix cross-user snapshots in cache keys or job payloads.

## Operational controls

- Read-only scopes only for linked accounts.
- Encrypt tokens at rest.
- Verify webhook signatures.
- Keep an append-only sync audit log for traceability.
