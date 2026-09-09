-- Guest orders retain contact details without requiring a website account.
ALTER TABLE storefront_orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS guest_contact JSONB;

ALTER TABLE storefront_orders DROP CONSTRAINT IF EXISTS storefront_orders_identity_present;
ALTER TABLE storefront_orders ADD CONSTRAINT storefront_orders_identity_present
  CHECK (user_id IS NOT NULL OR guest_contact IS NOT NULL);

CREATE INDEX IF NOT EXISTS storefront_orders_guest_email_idx
  ON storefront_orders ((guest_contact->>'email'))
  WHERE guest_contact IS NOT NULL;
