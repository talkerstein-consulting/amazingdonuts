CREATE TABLE IF NOT EXISTS personal_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  square_card_id TEXT NOT NULL,
  card_brand TEXT,
  last_4 TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  square_environment TEXT NOT NULL CHECK (square_environment IN ('sandbox','production')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,square_card_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS personal_cards_active_idx
  ON personal_cards(tenant_id,user_id,square_environment) WHERE status='active';
