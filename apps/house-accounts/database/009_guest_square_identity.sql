DROP INDEX IF EXISTS storefront_orders_guest_email_idx;

UPDATE storefront_orders
SET guest_contact = jsonb_build_object('squareCustomerId', raw_square->'order'->>'customer_id'),
    fulfillment = jsonb_build_object('type', fulfillment->>'type', 'scheduledAt', fulfillment->>'scheduledAt'),
    raw_square = jsonb_build_object(
      'order', jsonb_build_object('id', square_order_id, 'customer_id', raw_square->'order'->>'customer_id'),
      'payment', jsonb_build_object('id', square_payment_id, 'status', raw_square->'payment'->>'status')
    )
WHERE user_id IS NULL
  AND guest_contact IS NOT NULL
  AND COALESCE(raw_square->'order'->>'customer_id', '') <> '';

CREATE INDEX IF NOT EXISTS storefront_orders_guest_square_customer_idx
  ON storefront_orders (tenant_id, (guest_contact->>'squareCustomerId'))
  WHERE user_id IS NULL AND guest_contact IS NOT NULL;
