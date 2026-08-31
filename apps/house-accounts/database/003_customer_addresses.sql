SET search_path TO house_accounts, public;

CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address_type TEXT NOT NULL DEFAULT 'other' CHECK (address_type IN ('home','work','other')),
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  locality TEXT NOT NULL,
  administrative_district_level_1 TEXT NOT NULL DEFAULT 'ON',
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'CA',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_addresses_user_idx ON customer_addresses(tenant_id,user_id,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_one_default_idx ON customer_addresses(tenant_id,user_id) WHERE is_default;

INSERT INTO customer_addresses(tenant_id,user_id,label,address_type,address_line_1,address_line_2,locality,administrative_district_level_1,postal_code,country,is_default)
SELECT tenant_id,user_id,'Home','home',default_address->>'addressLine1',NULLIF(default_address->>'addressLine2',''),COALESCE(NULLIF(default_address->>'locality',''),'Toronto'),COALESCE(NULLIF(default_address->>'administrativeDistrictLevel1',''),'ON'),default_address->>'postalCode',COALESCE(NULLIF(default_address->>'country',''),'CA'),true
FROM customer_profiles
WHERE COALESCE(default_address->>'addressLine1','')<>'' AND COALESCE(default_address->>'postalCode','')<>''
AND NOT EXISTS(SELECT 1 FROM customer_addresses ca WHERE ca.tenant_id=customer_profiles.tenant_id AND ca.user_id=customer_profiles.user_id);
