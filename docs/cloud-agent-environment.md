# Cloud agent environment configuration

This repo is configured for Node/TypeScript monorepo workflows with Next.js + Expo.

## Baseline runtime

- Node version pin: `.nvmrc` (`22`)
- Engine constraints: root `package.json` (`node >=20.18.0 <23`, `npm >=10.8.0`)

## One-command bootstrap

Run from `/workspace`:

```bash
npm run setup:cloud
```

This executes:

1. `npm install`
2. `npm run typecheck`
3. `npm run build`

## Suggested Cursor env-setup prompt

Use this in Cursor's env setup flow:

> Configure this repository's cloud environment for a Node 22 + npm 10 TypeScript monorepo (Next.js + Expo). Preinstall Node/npm, enable npm dependency caching across runs, and run `npm run setup:cloud` from `/workspace` as the validation step.
