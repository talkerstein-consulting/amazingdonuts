ALTER TABLE house_account_applications
ADD COLUMN IF NOT EXISTS address JSONB NOT NULL DEFAULT '{}';
