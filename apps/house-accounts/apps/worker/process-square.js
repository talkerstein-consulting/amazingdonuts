import { postSale } from "../api/ledger.js";
import { transaction } from "../api/db.js";

const normalizeTender=(value)=>String(value||"").trim().toLowerCase();

export function isInstitutionalTender(payment, acceptedSources=["Amazing Donuts Account"]){
  if(payment?.source_type!=="EXTERNAL")return false;
  const source=normalizeTender(payment.external_details?.source);
  return acceptedSources.some((name)=>normalizeTender(name)===source);
}

export async function processNextSquareEvent(pool, square, acceptedSources) {
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
    const customerId=payment.customer_id||order?.customer_id;
    const account=await pool.query(`SELECT a.*,u.id AS purchaser_user_id FROM accounts a LEFT JOIN account_users au ON au.account_id=a.id AND au.status='active' LEFT JOIN customer_profiles cp ON cp.tenant_id=a.tenant_id AND cp.user_id=au.user_id AND cp.square_customer_id=$2 LEFT JOIN users u ON u.id=au.user_id WHERE a.tenant_id=$1 AND (a.square_customer_id=$2 OR cp.square_customer_id=$2) ORDER BY (a.square_customer_id=$2) DESC LIMIT 1`,[claimed.tenant_id,customerId]);
    const houseTender=isInstitutionalTender(payment,acceptedSources);
    if (!account.rowCount || !order || payment.status!=="COMPLETED") {
      await pool.query("UPDATE webhook_events SET status='review',processed_at=now(),error=$2 WHERE id=$1",[claimed.id,!account.rowCount?"No matching B2B customer was attached.":!order?"Payment has no Square order.":"Payment is not completed."]);
      return {status:"review"};
    }
    await transaction(pool,async(client)=>{
      await client.query(`INSERT INTO orders(tenant_id,account_id,purchaser_user_id,square_order_id,square_payment_id,square_customer_id,source,payment_method,status,location_id,receipt_number,subtotal,tax,total,currency,ordered_at,line_items,raw_square) VALUES($1,$2,$3,$4,$5,$6,'in_store',$7,'posted',$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT(tenant_id,square_order_id) DO UPDATE SET purchaser_user_id=COALESCE(EXCLUDED.purchaser_user_id,orders.purchaser_user_id),payment_method=EXCLUDED.payment_method`,[claimed.tenant_id,account.rows[0].id,account.rows[0].purchaser_user_id,order.id,payment.id,customerId,houseTender?"house_account":String(payment.source_type||"paid").toLowerCase(),payment.location_id,order.reference_id||order.ticket_name||order.id,Number(order.total_money?.amount||0)-Number(order.total_tax_money?.amount||0),Number(order.total_tax_money?.amount||0),Number(order.total_money?.amount||payment.amount_money.amount),order.total_money?.currency||payment.amount_money.currency,payment.created_at,JSON.stringify(order.line_items||[]),JSON.stringify({order,payment})]);
      if(houseTender)await postSale(client,{tenantId:claimed.tenant_id,accountId:account.rows[0].id,orderId:order.id,amount:Number(order.total_money?.amount||payment.amount_money.amount),currency:order.total_money?.currency||payment.amount_money.currency,description:`In-store order ${order.ticket_name||order.id}`,actorId:account.rows[0].purchaser_user_id});
      await client.query("UPDATE webhook_events SET status='completed',processed_at=now(),error=NULL WHERE id=$1",[claimed.id]);
    });
    return {status:"completed"};
  } catch(error) {
    await pool.query("UPDATE webhook_events SET status=CASE WHEN attempts>=5 THEN 'review' ELSE 'pending' END,available_at=now()+make_interval(secs=>LEAST(3600,power(2,attempts)::int*30)),error=$2 WHERE id=$1",[claimed.id,error.message]);
    throw error;
  }
}
