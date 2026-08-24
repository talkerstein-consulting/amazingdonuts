import { postSale } from "../api/ledger.js";
import { transaction } from "../api/db.js";

export async function processNextSquareEvent(pool, square) {
  const claimed = await transaction(pool, async (client) => {
    const result = await client.query(`SELECT * FROM webhook_events WHERE provider='square' AND status='pending' AND available_at<=now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`);
    if (!result.rowCount) return null;
    await client.query("UPDATE webhook_events SET status='processing',attempts=attempts+1 WHERE id=$1", [result.rows[0].id]);
    return result.rows[0];
  });
  if (!claimed) return null;
  try {
    const paymentId=claimed.payload?.data?.object?.payment?.id;
    if (!paymentId) throw new Error("Webhook does not reference a payment.");
    const payment=(await square.retrievePayment(paymentId)).payment;
    const order=payment.order_id ? (await square.retrieveOrder(payment.order_id)).order : null;
    const account=await pool.query("SELECT * FROM accounts WHERE tenant_id=$1 AND square_customer_id=$2",[claimed.tenant_id,payment.customer_id||order?.customer_id]);
    const houseTender=payment.source_type==="EXTERNAL" || payment.external_details?.source?.toLowerCase().includes("house account");
    if (!houseTender || !account.rowCount) {
      await pool.query("UPDATE webhook_events SET status='review',processed_at=now(),error=$2 WHERE id=$1",[claimed.id,!houseTender?"Payment is not a recognized house-account tender.":"No matching B2B customer was attached."]);
      return {status:"review"};
    }
    await transaction(pool,async(client)=>{
      await client.query(`INSERT INTO orders(tenant_id,account_id,square_order_id,square_payment_id,square_customer_id,source,status,location_id,subtotal,tax,total,currency,ordered_at,line_items,raw_square) VALUES($1,$2,$3,$4,$5,'in_store','posted',$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(tenant_id,square_order_id) DO NOTHING`,[claimed.tenant_id,account.rows[0].id,order.id,payment.id,payment.customer_id,payment.location_id,Number(order.total_money?.amount||0)-Number(order.total_tax_money?.amount||0),Number(order.total_tax_money?.amount||0),Number(order.total_money?.amount||payment.amount_money.amount),order.total_money?.currency||payment.amount_money.currency,payment.created_at,JSON.stringify(order.line_items||[]),JSON.stringify({order,payment})]);
      await postSale(client,{tenantId:claimed.tenant_id,accountId:account.rows[0].id,orderId:order.id,amount:Number(order.total_money?.amount||payment.amount_money.amount),currency:order.total_money?.currency||payment.amount_money.currency,description:`In-store order ${order.ticket_name||order.id}`});
      await client.query("UPDATE webhook_events SET status='completed',processed_at=now(),error=NULL WHERE id=$1",[claimed.id]);
    });
    return {status:"completed"};
  } catch(error) {
    await pool.query("UPDATE webhook_events SET status=CASE WHEN attempts>=5 THEN 'review' ELSE 'pending' END,available_at=now()+make_interval(secs=>LEAST(3600,power(2,attempts)::int*30)),error=$2 WHERE id=$1",[claimed.id,error.message]);
    throw error;
  }
}
