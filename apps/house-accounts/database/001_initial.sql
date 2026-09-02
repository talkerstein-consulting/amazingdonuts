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

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx ON password_reset_tokens(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS user_wishlist (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,user_id,product_id)
);
CREATE INDEX IF NOT EXISTS user_wishlist_user_idx ON user_wishlist(tenant_id,user_id,created_at DESC);

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

CREATE TABLE IF NOT EXISTS house_account_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  organization_name TEXT NOT NULL,
  organization_type TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  requested_credit_limit BIGINT,
  estimated_order_total BIGINT,
  billing_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_frequency IN ('weekly','monthly')),
  invoice_email TEXT,
  authorized_purchasers JSONB NOT NULL DEFAULT '[]',
  organization_pin_hash TEXT,
  address JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  account_id UUID REFERENCES accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,user_id)
);
CREATE INDEX IF NOT EXISTS house_account_applications_tenant_status_idx ON house_account_applications(tenant_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS account_users (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('account_admin','purchaser','viewer')),
  organization_role TEXT NOT NULL DEFAULT 'staff',
  purchase_limit BIGINT,
  purchaser_pin_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  PRIMARY KEY (account_id,user_id)
);

CREATE TABLE IF NOT EXISTS account_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  square_card_id TEXT NOT NULL,
  card_brand TEXT,
  last_4 TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  consented_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,square_card_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS account_cards_default_idx ON account_cards(account_id) WHERE status='active';

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS billing_frequency TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS auto_charge_statements BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS next_statement_at DATE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS period_spend_limit BIGINT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS period_spend_frequency TEXT NOT NULL DEFAULT 'monthly';
ALTER TABLE house_account_applications ADD COLUMN IF NOT EXISTS requested_credit_limit BIGINT;
ALTER TABLE house_account_applications ADD COLUMN IF NOT EXISTS estimated_order_total BIGINT;
ALTER TABLE house_account_applications ADD COLUMN IF NOT EXISTS billing_frequency TEXT NOT NULL DEFAULT 'monthly';
ALTER TABLE house_account_applications ADD COLUMN IF NOT EXISTS invoice_email TEXT;
ALTER TABLE house_account_applications ADD COLUMN IF NOT EXISTS authorized_purchasers JSONB NOT NULL DEFAULT '[]';
ALTER TABLE house_account_applications ADD COLUMN IF NOT EXISTS organization_pin_hash TEXT;
ALTER TABLE house_account_applications ADD COLUMN IF NOT EXISTS address JSONB NOT NULL DEFAULT '{}';
ALTER TABLE account_users ADD COLUMN IF NOT EXISTS organization_role TEXT NOT NULL DEFAULT 'staff';
ALTER TABLE account_users ADD COLUMN IF NOT EXISTS purchaser_pin_hash TEXT;
ALTER TABLE account_users DROP CONSTRAINT IF EXISTS account_users_organization_role_check;
UPDATE account_users au SET organization_role=CASE
  WHEN au.organization_role='principal' AND COALESCE(a.metadata->>'organizationType','Other business')='Shul' THEN 'rabbi'
  WHEN au.organization_role='principal' AND COALESCE(a.metadata->>'organizationType','Other business')='Caterer' THEN 'owner'
  WHEN au.organization_role='principal' AND COALESCE(a.metadata->>'organizationType','Other business')='Event planner' THEN 'owner'
  WHEN au.organization_role='principal' AND COALESCE(a.metadata->>'organizationType','Other business')='Corporate or office' THEN 'owner_executive'
  WHEN au.organization_role='principal' AND COALESCE(a.metadata->>'organizationType','Other business')='Other business' THEN 'owner'
  WHEN au.organization_role='manager' AND COALESCE(a.metadata->>'organizationType','Other business')='School' THEN 'office_manager'
  WHEN au.organization_role='manager' AND COALESCE(a.metadata->>'organizationType','Other business')='Shul' THEN 'administrator'
  WHEN au.organization_role='manager' AND COALESCE(a.metadata->>'organizationType','Other business')='Caterer' THEN 'operations_manager'
  WHEN au.organization_role='manager' AND COALESCE(a.metadata->>'organizationType','Other business')='Event planner' THEN 'lead_planner'
  WHEN au.organization_role='manager' AND COALESCE(a.metadata->>'organizationType','Other business')='Corporate or office' THEN 'office_manager'
  ELSE au.organization_role END
FROM accounts a WHERE a.id=au.account_id AND au.organization_role IN ('principal','manager');

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

CREATE TABLE IF NOT EXISTS custom_order_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  storefront_order_id UUID REFERENCES storefront_orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS custom_order_assets_order_idx ON custom_order_assets(storefront_order_id);
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS customizations JSONB NOT NULL DEFAULT '[]';
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS square_invoice_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS storefront_orders_invoice_idx ON storefront_orders(tenant_id,square_invoice_id) WHERE square_invoice_id IS NOT NULL;

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
ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_invoice_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS purchaser_user_id UUID REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'house_account';
INSERT INTO orders(tenant_id,account_id,purchaser_user_id,square_order_id,square_payment_id,square_customer_id,source,payment_method,status,subtotal,tax,total,currency,ordered_at,fulfillment,line_items,raw_square)
SELECT so.tenant_id,COALESCE(so.account_id,m.account_id),so.user_id,so.square_order_id,so.square_payment_id,cp.square_customer_id,'online',so.payment_method,
  CASE WHEN so.status IN ('cancelled','refunded') THEN so.status ELSE 'posted' END,
  so.subtotal,so.tax,so.total,so.currency,so.ordered_at,so.fulfillment,so.line_items,so.raw_square
FROM storefront_orders so
JOIN LATERAL (SELECT au.account_id FROM account_users au JOIN accounts a ON a.id=au.account_id AND a.status='active' WHERE au.user_id=so.user_id AND au.status='active' ORDER BY au.account_id LIMIT 1) m ON true
LEFT JOIN customer_profiles cp ON cp.tenant_id=so.tenant_id AND cp.user_id=so.user_id
WHERE so.payment_method='card'
ON CONFLICT(tenant_id,square_order_id) DO UPDATE SET purchaser_user_id=EXCLUDED.purchaser_user_id,payment_method=EXCLUDED.payment_method;

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
  order_id UUID REFERENCES orders(id),
  square_payment_id TEXT,
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'CAD',
  status TEXT NOT NULL CHECK (status IN ('pending','completed','failed','refunded')),
  received_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,square_payment_id)
);
ALTER TABLE payment_allocations ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id);
CREATE INDEX IF NOT EXISTS payment_allocations_order_idx ON payment_allocations(order_id,received_at DESC);

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

CREATE TABLE IF NOT EXISTS statement_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  statement_id UUID NOT NULL REFERENCES statements(id),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('issued','due_soon','overdue')),
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (statement_id,notification_type)
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

ALTER TABLE statements ADD COLUMN IF NOT EXISTS payment_token TEXT;
ALTER TABLE statements ADD COLUMN IF NOT EXISTS scheduled_charge_at TIMESTAMPTZ;
ALTER TABLE statements ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS career_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  page_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS career_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  employment_type TEXT NOT NULL,
  shift TEXT NOT NULL,
  blurb TEXT NOT NULL,
  responsibilities JSONB NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  UNIQUE (tenant_id,slug)
);
CREATE INDEX IF NOT EXISTS career_roles_tenant_order_idx ON career_roles(tenant_id,sort_order,created_at);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_notifications_tenant_date_idx ON admin_notifications(tenant_id,created_at DESC);

INSERT INTO career_settings(tenant_id,page_enabled)
SELECT id,true FROM tenants ON CONFLICT(tenant_id) DO NOTHING;

INSERT INTO career_roles(tenant_id,slug,title,employment_type,shift,blurb,responsibilities,sort_order)
SELECT t.id,r.slug,r.title,r.employment_type,r.shift,r.blurb,r.responsibilities::jsonb,r.sort_order
FROM tenants t
CROSS JOIN (VALUES
  ('baker','Overnight Baker','Full time','Sun – Thu, 11pm – 7am','The first shift of the day, and the reason the cases are full at opening. You mix, proof, fry and glaze.','["Run the fryer and the proofer through the overnight production list","Mix doughs and batters to the shop recipes","Hand the morning over to the decorating team, stocked and on time"]',10),
  ('decorator','Decorator','Full time','Mon – Fri, 6am – 2pm','Icing, sprinkles, printed toppers and the custom orders. Steady hands and an eye for a straight line.','["Ice and finish the daily run across donuts, cupcakes and cookies","Build custom and printed orders against the order sheet","Keep the cases looking like the photographs"]',20),
  ('counter','Counter & Orders','Part time','Flexible, weekday mornings','The person customers actually meet. Serving, boxing, taking online orders and knowing what is left.','["Serve walk-ins and box orders for pickup","Manage online and email orders on the day sheet","Keep the counter and the cases tidy through the rush"]',30),
  ('driver','Delivery Driver','Part time','Early mornings, own vehicle','Bulk and corporate orders across the city, arriving intact and when they were promised.','["Run the morning delivery list across Toronto","Check each order against its sheet before it leaves","Be the face of the bakery at the door"]',40)
) AS r(slug,title,employment_type,shift,blurb,responsibilities,sort_order)
ON CONFLICT(tenant_id,slug) DO NOTHING;
CREATE UNIQUE INDEX IF NOT EXISTS statements_payment_token_idx ON statements(payment_token) WHERE payment_token IS NOT NULL;
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
