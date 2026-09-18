CREATE TABLE IF NOT EXISTS abandoned_carts (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cart_id UUID NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  items JSONB NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, cart_id)
);
CREATE INDEX IF NOT EXISTS abandoned_carts_due_idx
  ON abandoned_carts(updated_at)
  WHERE completed_at IS NULL AND unsubscribed_at IS NULL AND reminder_sent_at IS NULL;

CREATE TABLE IF NOT EXISTS refund_notifications (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  square_refund_id TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, square_refund_id)
);
