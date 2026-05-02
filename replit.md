# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.
Contains "Invoice Be Beta AI" — a React Native Expo invoicing app with a Node/Express backend.
Domain: invoicebebeta.com. Palette: Sage (#3d5a4c) / gold. Font: Inter. Icons: Feather.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL (app_users, password_reset_tokens, reviews, connected_accounts, push_tokens) + stripe-replit-sync (stripe schema)
- **Payments**: Stripe + Stripe Connect (each user connects their own Stripe account)
- **Mobile**: Expo SDK 54, expo-router, AsyncStorage
- **Build**: esbuild (stripe-replit-sync externalized for path-based migration loading)

## Features

1. **Customer address book** — `CustomersContext`, `app/customers/index.tsx`, `app/customer/[email].tsx`. Auto-saved from invoices.
2. **Overdue payment reminders** — Dashboard banner shows unreminded overdue invoices, sends emails via `sendReminderEmail`. Tracks `remindedAt` on invoice.
3. **Revenue dashboard** — `RevenueCard` shows total, this-month, outstanding, and overdue count.
4. **Quote/estimate workflow** — Invoice/Quote toggle in create screen, `isQuote` flag on `Invoice`, quote numbering `QUO-XXXX`, "Convert to invoice" button, Quotes filter tab.
5. **Push notifications** — `expo-notifications`, `push_tokens` DB table, `/api/push/register` + `/api/push/send` endpoints, registered on sign-in/sign-up.
6. **VAT number** — stored on `User`, shown in email footer.
7. **Business address** — stored on `User`, shown in email footer.
8. **Onboarding flow** — First-time checklist shown after sign-up via `/(onboarding)`. Dismissed with `onboarding_seen_${userId}` key.

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

**API endpoints:**
- `POST /api/email/send-invoice` — emails invoice/quote summary + payment link to customer
- `POST /api/email/send-reminder` — emails overdue payment reminder
- `POST /api/email/send-confirmation` — emails payment confirmation to customer

**Source files:**
- `artifacts/api-server/src/emailService.ts` — Resend client, HTML templates, VAT/address footer
- `artifacts/api-server/src/routes/email.ts` — Express routes
- `artifacts/invoice-be-beta-ai/utils/emailApi.ts` — mobile API client

## Push Notifications

**API endpoints:**
- `POST /api/push/register` — stores `{ userId, token }` in `push_tokens` table
- `POST /api/push/send` — sends via Expo Push API to all tokens for userId

**Mobile:**
- `artifacts/invoice-be-beta-ai/utils/pushNotifications.ts` — `registerPushToken()` called on sign-in/sign-up
- Native only (web skipped)

## Key Files

- `artifacts/invoice-be-beta-ai/utils/types.ts` — all shared types
- `artifacts/invoice-be-beta-ai/contexts/AuthContext.tsx` — user state, VAT/address updates
- `artifacts/invoice-be-beta-ai/contexts/InvoicesContext.tsx` — invoice CRUD, quote numbering, monthRevenue/outstanding
- `artifacts/invoice-be-beta-ai/contexts/CustomersContext.tsx` — address book
- `artifacts/invoice-be-beta-ai/app/_layout.tsx` — routing, onboarding gate
- `artifacts/invoice-be-beta-ai/app/(tabs)/index.tsx` — dashboard, filters, reminder banner
- `artifacts/invoice-be-beta-ai/app/(tabs)/create.tsx` — invoice/quote create/edit
- `artifacts/invoice-be-beta-ai/app/(tabs)/profile.tsx` — VAT, address, Stripe, branding
- `artifacts/invoice-be-beta-ai/app/(onboarding)/index.tsx` — first-time onboarding
- `artifacts/invoice-be-beta-ai/app/customers/index.tsx` — address book screen
- `artifacts/invoice-be-beta-ai/app/invoice/[id].tsx` — invoice/quote detail, convert-to-invoice
- `artifacts/api-server/src/connectDb.ts` — all DB helpers
- `artifacts/api-server/src/routes/push.ts` — push notification endpoints

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-server run dev` — run API server locally
