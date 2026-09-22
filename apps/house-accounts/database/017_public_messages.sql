CREATE TABLE IF NOT EXISTS public_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS public_messages_rate_idx ON public_messages(tenant_id, email, created_at);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  unsubscribe_token_hash TEXT NOT NULL,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, email)
);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_unsubscribe_token_idx ON newsletter_subscribers(unsubscribe_token_hash);
