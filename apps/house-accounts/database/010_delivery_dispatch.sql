ALTER TABLE storefront_deliveries
  ADD COLUMN IF NOT EXISTS dispatch_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_driver_name TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS storefront_deliveries_dispatch_token_idx
  ON storefront_deliveries(dispatch_token_hash)
  WHERE dispatch_token_hash IS NOT NULL;
