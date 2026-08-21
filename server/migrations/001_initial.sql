CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  merchant_id TEXT,
  event_type TEXT NOT NULL,
  square_created_at TIMESTAMPTZ,
  payload JSONB NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received', 'processed', 'failed')),
  processing_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS webhook_events_status_idx
  ON webhook_events (processing_status, received_at);

CREATE TABLE IF NOT EXISTS square_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  square_order_id TEXT NOT NULL UNIQUE,
  square_customer_id TEXT,
  square_location_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'square',
  state TEXT NOT NULL,
  fulfillment_type TEXT,
  scheduled_at TIMESTAMPTZ,
  total_amount BIGINT,
  currency CHAR(3),
  version BIGINT,
  raw_order JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS square_orders_customer_idx ON square_orders (square_customer_id);
CREATE INDEX IF NOT EXISTS square_orders_schedule_idx ON square_orders (scheduled_at);

CREATE TABLE IF NOT EXISTS b2b_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL,
  square_customer_id TEXT UNIQUE,
  account_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'suspended', 'closed')),
  credit_limit_amount BIGINT NOT NULL DEFAULT 0 CHECK (credit_limit_amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'CAD',
  payment_terms_days INTEGER NOT NULL DEFAULT 30 CHECK (payment_terms_days >= 0),
  billing_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES b2b_accounts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'purchaser'
    CHECK (role IN ('account_admin', 'purchaser', 'billing')),
  status TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'disabled')),
  external_auth_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, email)
);

CREATE TABLE IF NOT EXISTS account_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES b2b_accounts(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address JSONB NOT NULL,
  address_type TEXT NOT NULL CHECK (address_type IN ('billing', 'delivery', 'both')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES b2b_accounts(id) ON DELETE CASCADE,
  square_catalog_object_id TEXT NOT NULL,
  unit_price_amount BIGINT NOT NULL CHECK (unit_price_amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'CAD',
  minimum_quantity INTEGER NOT NULL DEFAULT 1 CHECK (minimum_quantity > 0),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, square_catalog_object_id, minimum_quantity)
);

CREATE TABLE IF NOT EXISTS b2b_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES b2b_accounts(id),
  ordered_by_user_id UUID REFERENCES account_users(id),
  square_order_id TEXT UNIQUE,
  channel TEXT NOT NULL CHECK (channel IN ('online', 'pos', 'admin')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reserved', 'submitted', 'completed', 'cancelled', 'failed')),
  po_number TEXT,
  subtotal_amount BIGINT NOT NULL DEFAULT 0,
  tax_amount BIGINT NOT NULL DEFAULT 0,
  total_amount BIGINT NOT NULL CHECK (total_amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'CAD',
  fulfillment_type TEXT,
  scheduled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS b2b_orders_account_idx ON b2b_orders (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS credit_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES b2b_accounts(id),
  b2b_order_id UUID NOT NULL UNIQUE REFERENCES b2b_orders(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'captured', 'released', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS credit_reservations_active_idx
  ON credit_reservations (account_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES b2b_accounts(id),
  b2b_order_id UUID REFERENCES b2b_orders(id),
  square_order_id TEXT,
  square_payment_id TEXT,
  square_refund_id TEXT,
  entry_type TEXT NOT NULL
    CHECK (entry_type IN ('opening_balance', 'purchase', 'refund', 'credit', 'payment', 'adjustment')),
  amount BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'CAD',
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by_user_id UUID REFERENCES account_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ledger_entries_account_idx
  ON ledger_entries (account_id, effective_at, created_at);

CREATE TABLE IF NOT EXISTS statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES b2b_accounts(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  opening_balance BIGINT NOT NULL,
  closing_balance BIGINT NOT NULL,
  amount_due BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'CAD',
  due_at DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued'
    CHECK (status IN ('draft', 'issued', 'paid', 'void')),
  snapshot JSONB NOT NULL,
  pdf_storage_key TEXT,
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS house_account_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES b2b_accounts(id),
  square_payment_id TEXT UNIQUE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'CAD',
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  received_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS unmatched_pos_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  square_order_id TEXT NOT NULL UNIQUE,
  square_payment_id TEXT,
  candidate_square_customer_id TEXT,
  amount BIGINT,
  currency CHAR(3),
  reason TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'ignored')),
  matched_account_id UUID REFERENCES b2b_accounts(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('account_user', 'staff', 'system')),
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log (entity_type, entity_id, created_at);

CREATE TABLE IF NOT EXISTS catalog_sync_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  last_square_version_at TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ,
  sync_requested_at TIMESTAMPTZ,
  last_error TEXT
);
INSERT INTO catalog_sync_state (singleton) VALUES (true) ON CONFLICT DO NOTHING;
