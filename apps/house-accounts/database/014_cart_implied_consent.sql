ALTER TABLE abandoned_carts
  ADD COLUMN IF NOT EXISTS consent_basis TEXT NOT NULL DEFAULT 'express',
  ADD COLUMN IF NOT EXISTS qualifying_order_id UUID REFERENCES storefront_orders(id) ON DELETE SET NULL;
