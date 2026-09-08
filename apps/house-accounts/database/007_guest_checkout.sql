-- Guest checkout.
--
-- Sign-in was required to buy anything, which asked a first-time visitor to
-- commit to an account in order to buy a box of donuts. A guest order has no
-- user to hang off, so `user_id` becomes nullable and the contact details the
-- order was placed with are stored on the row itself.
--
-- The CHECK is the part that keeps this honest: every order still has an
-- identity, it is just one of two kinds. Without it a bug that dropped the
-- user would write an order nobody can be contacted about.

ALTER TABLE storefront_orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS guest_contact JSONB;

ALTER TABLE storefront_orders DROP CONSTRAINT IF EXISTS storefront_orders_identity_present;
ALTER TABLE storefront_orders ADD CONSTRAINT storefront_orders_identity_present
  CHECK (user_id IS NOT NULL OR guest_contact IS NOT NULL);

-- Guest orders are found by the email they were placed with — the bakery gets
-- "where is my order" from an address, not a user id.
CREATE INDEX IF NOT EXISTS storefront_orders_guest_email_idx
  ON storefront_orders ((guest_contact->>'email'))
  WHERE guest_contact IS NOT NULL;
