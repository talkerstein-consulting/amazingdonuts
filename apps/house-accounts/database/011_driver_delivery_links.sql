ALTER TABLE storefront_deliveries
  ADD COLUMN IF NOT EXISTS driver_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS driver_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_driver_phone TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS storefront_deliveries_driver_token_idx
  ON storefront_deliveries(driver_token_hash)
  WHERE driver_token_hash IS NOT NULL;
