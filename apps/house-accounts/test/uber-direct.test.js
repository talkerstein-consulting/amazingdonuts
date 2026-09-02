import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { UberDirectClient, validUberSignature } from "../apps/api/uber-direct.js";

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
