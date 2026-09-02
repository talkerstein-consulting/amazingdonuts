UPDATE payment_allocations pa
SET statement_id = NULL
FROM orders o, statements s
WHERE pa.order_id = o.id
  AND pa.statement_id = s.id
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(s.snapshot->'entries','[]'::jsonb)) entry
    WHERE entry->>'reference' IN (o.receipt_number,o.square_order_id)
  );

WITH totals AS (
  SELECT s.id,s.closing_balance,s.due_at,COALESCE(SUM(pa.amount) FILTER (WHERE pa.status='completed'),0)::bigint AS paid
  FROM statements s
  LEFT JOIN payment_allocations pa ON pa.statement_id=s.id
  WHERE s.status<>'void'
  GROUP BY s.id
)
UPDATE statements s
  SET status=CASE
    WHEN totals.closing_balance<=0 OR totals.paid>=totals.closing_balance THEN 'paid'
    WHEN totals.paid>0 THEN 'partially_paid'
    WHEN totals.due_at<CURRENT_DATE THEN 'overdue'
    ELSE 'issued'
  END,
  paid_at=CASE WHEN totals.closing_balance<=0 OR totals.paid>=totals.closing_balance THEN COALESCE(s.paid_at,now()) ELSE NULL END
FROM totals
WHERE s.id=totals.id;
