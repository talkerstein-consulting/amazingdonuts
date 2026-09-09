import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { UberDirectClient, validUberSignature } from "../apps/api/uber-direct.js";
import { assertDeliveryEnvironment } from "../apps/api/app.js";

test("authenticates Uber Direct with client credentials and caches the token",async()=>{
  const calls=[];
  const client=new UberDirectClient({clientId:"client",clientSecret:"secret",customerId:"customer",fetchImpl:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({access_token:"token",expires_in:3600}),{status:200,headers:{"Content-Type":"application/json"}});}});
  assert.equal(await client.accessToken(),"token");
  assert.equal(await client.accessToken(),"token");
  assert.equal(calls.length,1);
  assert.match(String(calls[0].options.body),/scope=eats.deliveries/);
});

test("verifies Uber webhook signatures against the untouched request body",()=>{
  const body=Buffer.from('{"event_id":"evt_1"}'),signature=createHmac("sha256","signing-key").update(body).digest("hex");
  assert.equal(validUberSignature(body,signature,"signing-key"),true);
  assert.equal(validUberSignature(body,"0".repeat(64),"signing-key"),false);
});

test("blocks production Square auto-dispatch outside explicit sandbox staging mode",()=>{
  const uber={sandbox:true};
  assert.throws(()=>assertDeliveryEnvironment({squareEnvironment:"production",uberDirectAutoDispatch:true,uberDirectMode:"sandbox",deploymentMode:"production",mixedEnvironmentTestMode:false},uber),/staging test mode/);
  assert.doesNotThrow(()=>assertDeliveryEnvironment({squareEnvironment:"production",uberDirectAutoDispatch:true,uberDirectMode:"sandbox",deploymentMode:"staging",mixedEnvironmentTestMode:true},uber));
  assert.throws(()=>assertDeliveryEnvironment({squareEnvironment:"production",uberDirectAutoDispatch:true,uberDirectMode:"production",deploymentMode:"staging",mixedEnvironmentTestMode:true},{sandbox:false}),/sandbox/);
});

test("uses customer-scoped Uber Direct delivery endpoints",async()=>{
  const calls=[];
  const client=new UberDirectClient({clientId:"client",clientSecret:"secret",customerId:"customer",mode:"sandbox",fetchImpl:async(url,options)=>{calls.push({url:String(url),options});if(String(url).includes("oauth"))return new Response(JSON.stringify({access_token:"token",expires_in:3600}),{status:200,headers:{"Content-Type":"application/json"}});return new Response(JSON.stringify({id:"delivery-1",status:"pending"}),{status:200,headers:{"Content-Type":"application/json"}});}});
  await client.createDelivery({quote_id:"quote-1"});
  assert.match(calls[1].url,/\/v1\/customers\/customer\/deliveries$/);
  assert.equal(JSON.parse(calls[1].options.body).quote_id,"quote-1");
});
