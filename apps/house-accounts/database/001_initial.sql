CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS house_accounts;
SET search_path TO house_accounts, public;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  domain TEXT UNIQUE,
  currency CHAR(3) NOT NULL DEFAULT 'CAD',
  timezone TEXT NOT NULL DEFAULT 'America/Toronto',
  brand JSONB NOT NULL DEFAULT '{}',
  square_environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (square_environment IN ('sandbox','production')),
  square_merchant_id TEXT,
  square_default_location_id TEXT,
  square_customer_group_id TEXT,
  square_collection_location_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('square')),
  environment TEXT NOT NULL CHECK (environment IN ('sandbox','production')),
  encrypted_credentials JSONB NOT NULL,
  key_reference TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,provider)
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_memberships (
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('owner','staff','account_admin','purchaser','viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,user_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  organization_name TEXT NOT NULL,
  account_code_hash TEXT NOT NULL,
  account_code_hint TEXT,
  square_customer_id TEXT,
  billing_email TEXT NOT NULL,
  billing_contact TEXT NOT NULL,
  credit_limit BIGINT NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  payment_terms_days INTEGER NOT NULL DEFAULT 30 CHECK (payment_terms_days BETWEEN 0 AND 120),
  billing_cycle_day INTEGER NOT NULL DEFAULT 1 CHECK (billing_cycle_day BETWEEN 1 AND 28),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','closed')),
  metadata JSONB NOT NULL DEFAULT '{}',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,square_customer_id)
);
CREATE INDEX IF NOT EXISTS accounts_tenant_status_idx ON accounts(tenant_id,status);

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  organization_name TEXT NOT NULL,
  organization_type TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  head_count TEXT,
  needed_for DATE,
  fulfillment TEXT,
  products JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  account_id UUID REFERENCES accounts(id),
  source TEXT NOT NULL DEFAULT 'bulk-orders',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS applications_tenant_status_idx ON applications(tenant_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS account_users (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('account_admin','purchaser','viewer')),
  purchase_limit BIGINT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  PRIMARY KEY (account_id,user_id)
);

CREATE TABLE IF NOT EXISTS customer_profiles (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  square_customer_id TEXT NOT NULL,
  default_phone TEXT,
  default_address JSONB NOT NULL DEFAULT '{}',
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,user_id),
  UNIQUE (tenant_id,square_customer_id)
);

CREATE TABLE IF NOT EXISTS storefront_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  account_id UUID REFERENCES accounts(id),
  square_order_id TEXT NOT NULL,
  square_payment_id TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('card','house_account')),
  status TEXT NOT NULL DEFAULT 'completed',
  subtotal BIGINT NOT NULL,
  tax BIGINT NOT NULL DEFAULT 0,
  total BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'CAD',
  fulfillment JSONB NOT NULL DEFAULT '{}',
  line_items JSONB NOT NULL DEFAULT '[]',
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_square JSONB NOT NULL DEFAULT '{}',
  UNIQUE (tenant_id,square_order_id)
);
CREATE INDEX IF NOT EXISTS storefront_orders_user_date_idx ON storefront_orders(tenant_id,user_id,ordered_at DESC);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  square_order_id TEXT NOT NULL,
  square_payment_id TEXT,
  square_customer_id TEXT,
  source TEXT NOT NULL CHECK (source IN ('online','in_store','import')),
  status TEXT NOT NULL CHECK (status IN ('pending','posted','cancelled','refunded','review')),
  location_id TEXT,
  receipt_number TEXT,
  subtotal BIGINT NOT NULL,
  tax BIGINT NOT NULL,
  total BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'CAD',
  ordered_at TIMESTAMPTZ NOT NULL,
  fulfillment JSONB NOT NULL DEFAULT '{}',
  line_items JSONB NOT NULL DEFAULT '[]',
  raw_square JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,square_order_id)
);
CREATE INDEX IF NOT EXISTS orders_account_date_idx ON orders(account_id,ordered_at DESC);

CREATE TABLE IF NOT EXISTS journal_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale','payment','credit','refund','adjustment','reversal','write_off')),
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  description TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  reversal_of UUID REFERENCES journal_transactions(id),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,source_type,source_id,transaction_type)
);

CREATE TABLE IF NOT EXISTS journal_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES journal_transactions(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  ledger_account TEXT NOT NULL CHECK (ledger_account IN ('accounts_receivable','collections','credits','write_offs')),
  amount BIGINT NOT NULL CHECK (amount <> 0),
  currency CHAR(3) NOT NULL DEFAULT 'CAD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS postings_account_idx ON journal_postings(account_id,created_at);

CREATE TABLE IF NOT EXISTS credit_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  idempotency_key TEXT NOT NULL UNIQUE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','captured','released','expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  statement_number TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_at DATE NOT NULL,
  opening_balance BIGINT NOT NULL,
  new_charges BIGINT NOT NULL,
  credits_and_payments BIGINT NOT NULL,
  closing_balance BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'CAD',
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('draft','issued','partially_paid','paid','overdue','void')),
  snapshot JSONB NOT NULL,
  pdf_storage_key TEXT,
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,statement_number),
  UNIQUE (account_id,period_start,period_end)
);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  statement_id UUID REFERENCES statements(id),
  square_payment_id TEXT,
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'CAD',
  status TEXT NOT NULL CHECK (status IN ('pending','completed','failed','refunded')),
  received_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,square_payment_id)
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  provider TEXT NOT NULL DEFAULT 'square',
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','review')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider,provider_event_id)
);

CREATE TABLE IF NOT EXISTS reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running','completed','failed')),
  cursor JSONB NOT NULL DEFAULT '{}',
  summary JSONB NOT NULL DEFAULT '{}',
  error TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  actor_user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_tenant_date_idx ON audit_log(tenant_id,created_at DESC);

CREATE OR REPLACE FUNCTION prevent_ledger_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Ledger records are immutable; create a reversal instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journal_transactions_immutable ON journal_transactions;
CREATE TRIGGER journal_transactions_immutable BEFORE UPDATE OR DELETE ON journal_transactions FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
DROP TRIGGER IF EXISTS journal_postings_immutable ON journal_postings;
CREATE TRIGGER journal_postings_immutable BEFORE UPDATE OR DELETE ON journal_postings FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
