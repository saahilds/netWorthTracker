# Net Worth Tracker

A starter monorepo scaffold for a personal net worth app with:

- Web dashboard (Next.js)
- Mobile dashboard shell (Expo React Native)
- Shared TypeScript domain models and dummy portfolio data
- Colorful UI cards plus holdings filters/sorting controls
- Interactive pie/line charts and daily movers leaderboard

## Budget options (US-only, Plaid-first)

These are practical ranges for a side project. Exact pricing changes by usage, institution coverage, and vendor plans.

### 1) Lean MVP (lowest spend)

- Aggregation: Plaid starter plan
- Market data: free/delayed endpoints where possible
- Car value: monthly lookup API call (low volume)
- Infra: Vercel hobby + low-cost managed Postgres

Typical monthly spend: **~$25-$100**

Tradeoffs:

- Some institutions may have weaker coverage
- More reliance on delayed data
- Fewer premium observability/security add-ons

### 2) Balanced (best value for most users)

- Aggregation: Plaid paid tier with broader access
- Market data: reliable paid delayed/near-real-time feed
- Jobs + alerting platform for sync reliability
- Managed Postgres with backups and better monitoring

Typical monthly spend: **~$150-$500**

Tradeoffs:

- Good reliability and UX for a personal app
- Still may need targeted fallback integrations for edge institutions

### 3) Premium (best experience)

- Plaid + one fallback data connector where needed
- Higher-tier market data (fresher updates, stronger SLAs)
- Robust job orchestration, monitoring, alerting, audit logs
- Production-grade managed DB, secrets, and security controls

Typical monthly spend: **~$600-$2,500+**

Tradeoffs:

- Highest reliability and freshness
- Better support for multi-user expansion
- More engineering overhead and vendor complexity

## Repository layout

```text
apps/
  web/        Next.js app (dashboard + drill-down starter)
  mobile/     Expo app (dashboard shell)
packages/
  shared/     Shared types, dummy data, and analytics helpers
```

## Quick start

```bash
npm install
npm run dev:web
```

### Backend setup (Auth + Plaid + Prisma)

1. Copy environment template:

```bash
cp .env.example .env
```

2. Fill in:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - Google OAuth credentials (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`)
   - Plaid credentials (`PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`)
   - `APP_ENCRYPTION_KEY` (base64 32-byte value)

3. Run Prisma migration + client generation:

```bash
npm run db:migrate
npm run db:generate
```

4. Start web app and sign in, then connect Plaid:

```bash
npm run dev:web
```

For mobile:

```bash
npm run dev:mobile
```

If Expo cannot resolve `../../App` in a monorepo, ensure the mobile workspace uses
`apps/mobile/index.ts` as the entrypoint (already configured in this repo).

If you hit a React Native version mismatch, reinstall and clear Metro cache:

```bash
npm install
npm run start --workspace @networth/mobile -- --clear
```

## Cloud agent bootstrap

```bash
npm run setup:cloud
```

This command runs install, typecheck, and build from `/workspace`.
