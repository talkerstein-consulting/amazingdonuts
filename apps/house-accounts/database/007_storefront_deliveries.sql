CREATE TABLE IF NOT EXISTS storefront_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  storefront_order_id UUID NOT NULL REFERENCES storefront_orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'uber_direct',
  environment TEXT NOT NULL CHECK (environment IN ('sandbox','production')),
  status TEXT NOT NULL DEFAULT 'pending',
  quote_id TEXT,
  external_delivery_id TEXT,
  tracking_url TEXT,
  raw_provider JSONB NOT NULL DEFAULT '{}',
  last_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (storefront_order_id),
  UNIQUE (provider,external_delivery_id)
);
CREATE INDEX IF NOT EXISTS storefront_deliveries_status_idx ON storefront_deliveries(tenant_id,status,updated_at DESC);
