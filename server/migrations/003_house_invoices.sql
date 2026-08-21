CREATE TABLE IF NOT EXISTS b2b_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES b2b_accounts(id),
  statement_id UUID REFERENCES statements(id),
  square_invoice_id TEXT NOT NULL UNIQUE,
  square_order_id TEXT NOT NULL UNIQUE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'CAD',
  status TEXT NOT NULL DEFAULT 'UNPAID',
  public_url TEXT,
  due_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

