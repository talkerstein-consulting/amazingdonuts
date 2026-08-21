import { withTransaction } from "./pool.js";

const fulfillmentSchedule = (order) => {
  const fulfillment = order.fulfillments?.[0];
  return {
    type: fulfillment?.type || null,
    scheduledAt:
      fulfillment?.pickup_details?.pickup_at ||
      fulfillment?.delivery_details?.deliver_at ||
      null
  };
};

async function upsertOrder(client, order) {
  if (!order?.id || !order.location_id) return;
  const fulfillment = fulfillmentSchedule(order);
  await client.query(
    `INSERT INTO square_orders (
       square_order_id, square_customer_id, square_location_id, source, state,
       fulfillment_type, scheduled_at, total_amount, currency, version, raw_order
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (square_order_id) DO UPDATE SET
       square_customer_id = EXCLUDED.square_customer_id,
       state = EXCLUDED.state,
       fulfillment_type = EXCLUDED.fulfillment_type,
       scheduled_at = EXCLUDED.scheduled_at,
       total_amount = EXCLUDED.total_amount,
       currency = EXCLUDED.currency,
       version = EXCLUDED.version,
       raw_order = EXCLUDED.raw_order,
       updated_at = now()`,
    [
      order.id,
      order.customer_id || null,
      order.location_id,
      order.source?.name || "square",
      order.state || "UNKNOWN",
      fulfillment.type,
      fulfillment.scheduledAt,
      order.total_money?.amount ?? null,
      order.total_money?.currency ?? null,
      order.version ?? null,
      order
    ]
  );
}

export async function resolveWebhookOrder(event, square) {
  const object = event.data?.object || {};
  const candidate = object.order || object.order_updated || object.order_created || object.order_fulfillment_updated;
  if (candidate?.id && candidate.location_id) return candidate;
  const orderId = candidate?.order_id || object.order_id;
  if (!orderId || !square?.retrieveOrder) return null;
  const result = await square.retrieveOrder(orderId);
  return result.order || null;
}

export async function persistWebhook(pool, event, square) {
  const order = await resolveWebhookOrder(event, square);
  return withTransaction(pool, async (client) => {
    const inserted = await client.query(
      `INSERT INTO webhook_events (
         event_id, merchant_id, event_type, square_created_at, payload
       ) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [event.event_id, event.merchant_id || null, event.type, event.created_at || null, event]
    );
    if (!inserted.rowCount) return { duplicate: true };

    try {
      const object = event.data?.object || {};
      await upsertOrder(client, order);

      const payment = object.payment;
      if (payment?.id && payment.status === "COMPLETED" && payment.order_id) {
        const invoice = await client.query(
          `SELECT id,account_id,amount,currency FROM b2b_invoices WHERE square_order_id=$1`,
          [payment.order_id]
        );
        if (invoice.rowCount) {
          const record = invoice.rows[0];
          await client.query(
            `INSERT INTO house_account_payments (account_id,square_payment_id,amount,currency,status,received_at,metadata)
             VALUES ($1,$2,$3,$4,'completed',now(),$5) ON CONFLICT (square_payment_id) DO NOTHING`,
            [record.account_id,payment.id,Number(payment.total_money?.amount||payment.amount_money?.amount||record.amount),payment.total_money?.currency||payment.amount_money?.currency||record.currency,{ invoiceId: record.id }]
          );
          await client.query(
            `INSERT INTO ledger_entries (account_id,square_order_id,square_payment_id,entry_type,amount,currency,description,idempotency_key,metadata)
             VALUES ($1,$2,$3,'payment',$4,$5,'Square invoice payment',$6,$7)
             ON CONFLICT (idempotency_key) DO NOTHING`,
            [record.account_id,payment.order_id,payment.id,-Number(payment.total_money?.amount||payment.amount_money?.amount||record.amount),payment.total_money?.currency||payment.amount_money?.currency||record.currency,`invoice-payment-${payment.id}`,{ invoiceId: record.id }]
          );
          await client.query(`UPDATE b2b_invoices SET status='PAID',updated_at=now() WHERE id=$1`, [record.id]);
        }
      }

      if (event.type === "catalog.version.updated") {
        await client.query(
          `UPDATE catalog_sync_state
           SET sync_requested_at = now(), last_square_version_at = $1`,
          [object.catalog_version?.updated_at || event.created_at || null]
        );
      }

      await client.query(
        `UPDATE webhook_events
         SET processing_status = 'processed', processed_at = now()
         WHERE event_id = $1`,
        [event.event_id]
      );
      return { duplicate: false };
    } catch (error) {
      await client.query(
        `UPDATE webhook_events
         SET processing_status = 'failed', processing_error = $2
         WHERE event_id = $1`,
        [event.event_id, error.message]
      );
      throw error;
    }
  });
}
