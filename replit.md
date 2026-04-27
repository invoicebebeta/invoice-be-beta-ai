# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.
Contains "Invoice Be Beta AI" — a React Native Expo invoicing app with a Node/Express backend.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL (connected_accounts table) + stripe-replit-sync (stripe schema)
- **Payments**: Stripe + Stripe Connect (each user connects their own Stripe account)
- **Mobile**: Expo SDK 54, expo-router, AsyncStorage
- **Build**: esbuild (stripe-replit-sync externalized for path-based migration loading)

## Stripe Connect Integration

Each app user can connect their own Stripe account via OAuth (Stripe Connect Standard).

### Required env var to enable the OAuth flow:
- `STRIPE_CONNECT_CLIENT_ID` — get from Stripe Dashboard > Connect > Settings

### API endpoints (port 8080):
- `GET /api/stripe/connect/url?userId=xxx` — returns OAuth URL
- `GET /api/stripe/connect/callback` — handles OAuth, stores account in DB
- `GET /api/stripe/connect/status?userId=xxx` — check if user has connected Stripe
- `DELETE /api/stripe/connect?userId=xxx` — disconnect account
- `POST /api/stripe/invoice/checkout` — create Stripe Checkout session for an invoice

### Mobile app API URL config:
- Set `EXPO_PUBLIC_API_BASE_URL` to the API server URL (e.g. `https://<domain>:8080`)
- Defaults to same-origin port 8080 on web, localhost:8080 on native

## Email

Transactional email via Resend. API key stored as `RESEND_API_KEY` secret.

> Note: User dismissed the Replit Resend integration connector — API key stored manually as a secret.

**API endpoints:**
- `POST /api/email/send-invoice` — emails invoice summary + payment link to customer
- `POST /api/email/send-confirmation` — emails payment confirmation to customer

**Mobile app:**
- "Email invoice to [customer]" button on every invoice detail screen
- Sends current payment link (deposit/final/any) alongside the invoice summary

**Source files:**
- `artifacts/api-server/src/emailService.ts` — Resend client, HTML templates, send functions
- `artifacts/api-server/src/routes/email.ts` — Express routes
- `artifacts/invoice-be-beta-ai/utils/emailApi.ts` — mobile API client

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
