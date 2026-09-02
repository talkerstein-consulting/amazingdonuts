CREATE TABLE IF NOT EXISTS credit_increase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  current_credit_limit BIGINT NOT NULL,
  requested_credit_limit BIGINT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credit_increase_requests_account_status_idx
  ON credit_increase_requests(account_id,status,created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS credit_increase_requests_one_pending_idx
  ON credit_increase_requests(account_id) WHERE status='pending';
