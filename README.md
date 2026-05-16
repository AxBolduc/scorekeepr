# Scorekeepr

Turbo monorepo scaffold for Scorekeepr.

## Apps

- `apps/web` — TanStack Start frontend on port 3000
- `apps/api` — Effect 4 beta HTTP API on port 4000
- `packages/shared` — shared schemas and contract types

## Getting started

```bash
pnpm install
pnpm dev
```

Copy app environment examples if you want to override defaults:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```

The web app checks `GET http://localhost:4000/health` and renders the backend status.

## Useful commands

```bash
pnpm build
pnpm check
pnpm --filter @scorekeepr/web dev
pnpm --filter @scorekeepr/api dev
```
