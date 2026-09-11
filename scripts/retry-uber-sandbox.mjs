import dotenv from 'dotenv';
import { createPool } from '../apps/house-accounts/apps/api/db.js';
import { SquareAdapter } from '../apps/house-accounts/packages/square/client.js';
import { UberDirectClient } from '../apps/house-accounts/apps/api/uber-direct.js';

dotenv.config({path:['.env.development.local','.env.local'],quiet:true});
const orderId=process.argv[2];
if(!orderId) throw new Error('Provide the existing Square order ID. Add --apply to retry.');
const apply=process.argv.includes('--apply');
const pool=createPool(process.env.DATABASE_URL);
const square=new SquareAdapter({environment:'production',accessToken:process.env.SQUARE_ACCESS_TOKEN,apiVersion:'2026-07-15'});
let claimed=false,storedId;
try {
  const row=(await pool.query(`SELECT so.*,sd.environment,sd.status AS delivery_status,sd.external_delivery_id,sd.raw_provider FROM storefront_orders so JOIN storefront_deliveries sd ON sd.storefront_order_id=so.id WHERE so.square_order_id=$1`,[orderId])).rows[0];
  if(!row || row.environment!=='sandbox' || row.fulfillment?.type!=='delivery' || row.raw_square?.order?.source?.name!=='WEBSITE TEST - UBER SANDBOX') throw new Error('Not an existing sandbox delivery test order.');
  storedId=row.id;
  if(row.external_delivery_id){console.log(JSON.stringify({alreadyCreated:true,deliveryId:row.external_delivery_id}));process.exitCode=0;}
  else {
    if(row.delivery_status!=='dispatch_failed' || !/client ID is invalid/i.test(row.raw_provider?.error||'')) throw new Error('Retry requires a confirmed pre-dispatch authentication failure; reconcile other failures first.');
    const payment=(await square.retrievePayment(row.square_payment_id)).payment;
    if(payment.status!=='COMPLETED' || payment.order_id!==orderId) throw new Error('Original completed payment could not be verified.');
    const original=(await square.retrieveOrder(orderId)).order;
    if(original.state==='CANCELED' || original.fulfillments?.some(f=>['COMPLETED','CANCELED','FAILED'].includes(f.state))) throw new Error('Order is no longer awaiting fulfillment.');
    const location=(await square.request(`/v2/locations/${encodeURIComponent(original.location_id)}`)).location;
    // Published bakery contact, also used by SHOP_ADDRESS in src/lib/routes.ts.
    location.phone_number ||= '+14163987546';
    if(!location.address?.postal_code) throw new Error('Square pickup location lacks postal code.');
    const scheduled=new Date(row.fulfillment.scheduledAt);
    if(scheduled.getTime() < Date.now()+60*60*1000) throw new Error('Scheduled window is too close or past; obtain a new test time before retrying.');
    console.log(JSON.stringify({orderId,paymentVerified:true,existingDelivery:false,scheduledAt:scheduled.toISOString(),apply}));
    if(apply){
      // Receive credentials over stdin, never command arguments or a tracked file.
      console.log('Awaiting test credentials on stdin');
      if(process.stdin.isTTY)process.stdin.setRawMode(true);
      let input=''; for await(const chunk of process.stdin){input+=chunk;if(input.includes('\n'))break;}
      if(process.stdin.isTTY)process.stdin.setRawMode(false);
      const credentials=JSON.parse(input.trim());
      if(credentials.customerId!=='18ae0517-394c-5053-8351-9e26b3014b21')throw new Error('Only the verified Uber Test App customer is allowed.');
      const uber=new UberDirectClient({...credentials,mode:'sandbox'});
      await uber.accessToken();
      const address=a=>JSON.stringify({street_address:[a.address_line_1,a.address_line_2||''],city:a.locality,state:a.administrative_district_level_1,zip_code:a.postal_code,country:a.country||'CA'});
      const f=row.fulfillment,a=f.address;
      const pickup=address(location.address),dropoff=address({address_line_1:a.addressLine1,address_line_2:a.addressLine2,locality:a.locality,administrative_district_level_1:a.administrativeDistrictLevel1,postal_code:a.postalCode,country:a.country});
      const phone=v=>'+'+String(v).replace(/\D/g,'').replace(/^(\d{10})$/,'1$1');
      const timing={pickup_ready_dt:new Date(scheduled.getTime()-45*60000).toISOString(),pickup_deadline_dt:new Date(scheduled.getTime()-15*60000).toISOString(),dropoff_ready_dt:scheduled.toISOString(),dropoff_deadline_dt:new Date(scheduled.getTime()+30*60000).toISOString()};
      const quote=await uber.createQuote({pickup_address:pickup,dropoff_address:dropoff,pickup_phone_number:phone(location.phone_number),dropoff_phone_number:phone(f.recipient.phone),...timing});
      const claim=await pool.query("UPDATE storefront_deliveries SET status='retrying',updated_at=now() WHERE storefront_order_id=$1 AND status='dispatch_failed' AND external_delivery_id IS NULL RETURNING id",[row.id]);
      if(!claim.rowCount)throw new Error('Another retry has already claimed this order.');
      claimed=true;
      const delivery=await uber.createDelivery({quote_id:quote.id,pickup_name:location.name,pickup_address:pickup,pickup_phone_number:phone(location.phone_number),dropoff_name:f.recipient.displayName,dropoff_address:dropoff,dropoff_phone_number:phone(f.recipient.phone),dropoff_instructions:f.deliveryInstructions||'',manifest_items:original.line_items.map(line=>({name:line.name,quantity:Number(line.quantity),size:'small'})),external_id:orderId,idempotency_key:`uber-${orderId}`,test_specifications:{robo_courier_specification:{mode:'auto'}},...timing});
      const id=delivery.id||delivery.delivery_id;
      if(!id)throw new Error('Uber response missing delivery ID; reconcile before another retry.');
      await pool.query("UPDATE storefront_deliveries SET status=$2,external_delivery_id=$3,quote_id=$4,tracking_url=$5,raw_provider=$6,updated_at=now() WHERE storefront_order_id=$1",[row.id,delivery.status,id,quote.id,delivery.tracking_url||null,JSON.stringify({quote,delivery})]);
      claimed=false;
      const confirmed=await uber.retrieveDelivery(id);
      console.log(JSON.stringify({deliveryId:id,status:confirmed.status,liveMode:confirmed.live_mode,trackingUrl:confirmed.tracking_url,dropoffEta:confirmed.dropoff_eta,squarePaymentUnchanged:true}));
    }
  }
} catch(error) {
  if(claimed)await pool.query("UPDATE storefront_deliveries SET status='retry_needs_review',updated_at=now() WHERE storefront_order_id=$1 AND external_delivery_id IS NULL",[storedId]);
  console.error(error.message);process.exitCode=1;
} finally {await pool.end();}
