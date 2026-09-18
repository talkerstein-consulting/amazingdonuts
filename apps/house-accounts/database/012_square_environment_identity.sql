ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS square_customer_ids JSONB NOT NULL DEFAULT '{}';

ALTER TABLE account_cards
  ADD COLUMN IF NOT EXISTS square_environment TEXT;

ALTER TABLE account_cards
  DROP CONSTRAINT IF EXISTS account_cards_square_environment_check;
ALTER TABLE account_cards
  ADD CONSTRAINT account_cards_square_environment_check
  CHECK (square_environment IN ('sandbox','production'));

-- Existing cards predate environment scoping and were created for the production
-- Square test deployment. Sandbox account credit does not require a backing card.
UPDATE account_cards SET square_environment='production' WHERE square_environment IS NULL;

ALTER TABLE account_cards
  ALTER COLUMN square_environment SET NOT NULL;

DROP INDEX IF EXISTS account_cards_default_idx;
CREATE UNIQUE INDEX IF NOT EXISTS account_cards_environment_default_idx
  ON account_cards(account_id,square_environment)
  WHERE status='active';
