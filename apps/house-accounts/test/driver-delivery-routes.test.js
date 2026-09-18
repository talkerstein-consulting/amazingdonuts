import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../apps/api/app.js";

const squareOrder = {
  id:"SQUARE-ORDER-12345678",
  location_id:"LOCATION",
  version:4,
  total_money:{amount:2450,currency:"CAD"},
  line_items:[{name:"Twelve donuts",quantity:"1"}],
  fulfillments:[{uid:"delivery",type:"DELIVERY",state:"PROPOSED",delivery_details:{deliver_at:"2026-09-20T14:00:00Z",note:"Leave at reception.\n\nSTAFF DELIVERY DISPATCH: https://example.test",recipient:{display_name:"Test Customer",phone_number:"+14165550123",address:{address_line_1:"1 Test Street",locality:"Toronto",administrative_district_level_1:"ON",postal_code:"M5V 2T6"}}}}],
};

test("driver capability exposes only its delivery and revokes both links when completed",async t=>{
  const updates=[],squareWrites=[];
  const baseRecord={id:"DELIVERY",tenant_id:"TENANT",storefront_order_id:"ORDER",square_order_id:squareOrder.id,total:2450,currency:"CAD",fulfillment:{type:"delivery",scheduledAt:"2026-09-20T14:00:00Z"},line_items:squareOrder.line_items,provider:"own_driver",status:"out_for_delivery",assigned_driver_name:"Test Driver",dispatch_completed_at:null};
  const pool={query:async(sql,params)=>{
    if(sql.includes("FROM sessions"))return {rows:[],rowCount:0};
    if(sql.includes("sd.driver_token_hash"))return {rows:[baseRecord],rowCount:1};
    if(sql.includes("UPDATE storefront_deliveries SET status")){updates.push({sql,params});return {rows:[{...baseRecord,status:params[1],dispatch_completed_at:new Date()}],rowCount:1};}
    throw new Error(`Unexpected query: ${sql}`);
  }};
  const square={retrieveOrder:async()=>({order:squareOrder}),request:async(path,options)=>{squareWrites.push({path,options});return {};}};
  const app=createApp({pool,square,config:{siteUrl:"https://example.test"}}),server=app.listen(0,"127.0.0.1");
  await new Promise(resolve=>server.once("listening",resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;

  const read=await fetch(`${base}/api/public/driver/secret-token`),body=await read.json();
  assert.equal(read.status,200);
  assert.equal(body.dispatch.view,"driver");
  assert.equal(body.dispatch.recipient.phone,"+14165550123");
  assert.equal(body.dispatch.instructions,"Leave at reception.");
  assert.equal("assignedDriverPhone" in body.dispatch,false);

  const completed=await fetch(`${base}/api/public/driver/secret-token/status`,{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://example.test"},body:JSON.stringify({status:"delivered"})});
  assert.equal(completed.status,200,await completed.text());
  assert.match(updates[0].sql,/dispatch_token_hash=CASE WHEN \$3 THEN NULL/);
  assert.match(updates[0].sql,/driver_token_hash=CASE WHEN \$3 THEN NULL/);
  assert.equal(squareWrites[0].path,`/v2/orders/${squareOrder.id}`);
  assert.equal(squareWrites[0].options.body.order.fulfillments[0].state,"COMPLETED");
});
