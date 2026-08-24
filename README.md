# House Account Platform

Standalone, multi-tenant accounts-receivable service for merchants using Square for products, orders, KDS, taxes, and payment processing.

## Boundaries

- The storefront links to this portal but does not import its code or own its database.
- Square is the source for customers, itemized orders, taxes, operational fulfillment, and card payments.
- This service is authoritative for B2B authorization, credit, immutable receivables, statements, collections, and reconciliation.
- Every merchant-owned row is scoped by `tenant_id`.

## Local setup

```bash
cp .env.example .env
npm install
npm run db:migrate
SEED_ADMIN_PASSWORD='a-long-development-password' npm run db:seed
npm run dev:api
npm run dev
```

The portal runs at `http://127.0.0.1:5174`. A database-free visual preview is available at `http://127.0.0.1:5174/?demo=1`.

## Production routes

- `/` - customer portal or role-aware owner dashboard
- `/api/auth/*` - independent portal sessions
- `/api/admin/accounts/*` - owner operations and statements
- `/api/orders/house-account` - Square order plus full-value external payment
- `/api/webhooks/square` - idempotent webhook inbox
- `/api/statements/:id.pdf` - permission-checked statement rendering

## Phase 0 gate

Production in-store synchronization must remain disabled until a real Square POS transaction confirms the custom tender representation, attached customer behavior, and settlement reporting treatment.
