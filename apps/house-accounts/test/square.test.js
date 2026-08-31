import test from "node:test";
import assert from "node:assert/strict";
import { SquareAdapter } from "../packages/square/client.js";

test("records an online house-account settlement as a full-value external payment",async()=>{
  let call;
  const square=new SquareAdapter({environment:"sandbox",accessToken:"token",apiVersion:"2026-07-15",fetchImpl:async(url,options)=>{call={url:String(url),body:JSON.parse(options.body)};return new Response(JSON.stringify({payment:{id:"PAYMENT"}}),{status:200,headers:{"Content-Type":"application/json"}});}});
  await square.createPayment({source_id:"EXTERNAL",amount_money:{amount:42500,currency:"CAD"},external_details:{type:"OTHER",source:"Online House Account"}});
  assert.match(call.url,/\/v2\/payments$/); assert.equal(call.body.source_id,"EXTERNAL"); assert.equal(call.body.amount_money.amount,42500); assert.equal(call.body.external_details.source,"Online House Account");
});

test("deletes a Square customer profile with the customer endpoint",async()=>{
  let call;
  const square=new SquareAdapter({environment:"sandbox",accessToken:"token",apiVersion:"2026-07-15",fetchImpl:async(url,options)=>{call={url:String(url),method:options.method};return new Response("{}",{status:200,headers:{"Content-Type":"application/json"}});}});
  await square.deleteCustomer("CUSTOMER-1");
  assert.match(call.url,/\/v2\/customers\/CUSTOMER-1$/);
  assert.equal(call.method,"DELETE");
});
