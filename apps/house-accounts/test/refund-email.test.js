import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createApp } from "../apps/api/app.js";

test("Square refund emails a guest once completion is confirmed, not while pending",async t=>{
  const messages=[],seen=new Set(),queries=[];
  let refundStatus="PENDING";
  const pool={query:async(sql,values=[])=>{
    queries.push(sql);
    if(sql.includes("FROM sessions"))return {rows:[],rowCount:0};
    if(sql.includes("FROM tenants WHERE square_merchant_id"))return {rows:[{id:"tenant-1"}],rowCount:1};
    if(sql.includes("INSERT INTO webhook_events"))return {rows:[],rowCount:1};
    if(sql.includes("INSERT INTO refund_notifications")){
      if(seen.has(values[1]))return {rows:[],rowCount:0};
      seen.add(values[1]);return {rows:[{square_refund_id:values[1]}],rowCount:1};
    }
    if(sql.includes("FROM storefront_orders so LEFT JOIN users"))return {rows:[{
      id:"order-1",square_order_id:"square-order-1",total:2000,currency:"CAD",
      customer_email:null,guest_contact:{squareCustomerId:"customer-1"},raw_square:{}
    }],rowCount:1};
    if(sql.includes("FROM orders WHERE tenant_id"))return {rows:[],rowCount:0};
    if(sql.includes("UPDATE storefront_orders"))return {rows:[],rowCount:1};
    if(sql.includes("UPDATE refund_notifications"))return {rows:[],rowCount:1};
    throw new Error(`Unexpected query: ${sql}`);
  }};
  const square={retrieveRefund:async()=>({refund:{id:"refund-1",status:refundStatus,payment_id:"payment-1",amount_money:{amount:500,currency:"CAD"}}}),retrieveCustomer:async()=>({customer:{email_address:"guest@example.com"}})};
  const config={siteUrl:"https://example.test",sessionSecret:"secret",squareWebhookSignatureKey:"webhook-key",emailFrom:"Amazing Donuts <orders@example.com>",mailTransport:{sendMail:async message=>{messages.push(message);}}};
  const app=createApp({pool,square,config}),server=app.listen(0,"127.0.0.1");
  await new Promise(resolve=>server.once("listening",resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`http://127.0.0.1:${server.address().port}/api/webhooks/square`;
  config.squareWebhookNotificationUrl=url;
  for(const eventId of ["event-created","event-updated","event-replayed"]){
    if(eventId!=="event-created")refundStatus="COMPLETED";
    const body=JSON.stringify({event_id:eventId,merchant_id:"merchant-1",type:eventId==="event-created"?"refund.created":"refund.updated",data:{object:{refund:{id:"refund-1"}}}});
    const signature=createHmac("sha256",config.squareWebhookSignatureKey).update(url).update(body).digest("base64");
    const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","x-square-hmacsha256-signature":signature},body});
    assert.equal(response.status,202,await response.text());
    if(eventId==="event-created")assert.equal(messages.length,0);
  }
  assert.equal(messages.length,1);
  assert.equal(messages[0].to,"guest@example.com");
  assert.match(messages[0].text,/\$5\.00/);
  assert.equal(queries.filter(sql=>sql.includes("UPDATE storefront_orders SET status=CASE")).length,1);
});
