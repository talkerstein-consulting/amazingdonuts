import test from "node:test";
import assert from "node:assert/strict";
import { attachGuestOrders, findOrCreateGuestCustomer, guestFulfillmentReference, guestOrderReference } from "../apps/api/guest-customer.js";

test("guest checkout reuses every exact-email Square customer match", async () => {
  const square={searchCustomers:async()=>({customers:[{id:"customer-1",email_address:"guest@example.com"},{id:"customer-2",email_address:"GUEST@example.com"}]}),createCustomer:async()=>assert.fail("must reuse a match")};
  const result=await findOrCreateGuestCustomer(square,{email:"Guest@Example.com"},"checkout-1");
  assert.equal(result.customer.id,"customer-1");
  assert.deepEqual(result.customerIds,["customer-1","customer-2"]);
});

test("guest checkout creates a Square customer when email has no exact match", async () => {
  let payload;
  const square={searchCustomers:async()=>({customers:[]}),createCustomer:async input=>{payload=input;return {customer:{id:"customer-new"}};}};
  const result=await findOrCreateGuestCustomer(square,{firstName:"Ada",lastName:"Lovelace",email:"ADA@EXAMPLE.COM",phone:"+14165550123"},"checkout-2");
  assert.equal(result.customer.id,"customer-new");
  assert.equal(payload.email_address,"ada@example.com");
});

test("guest order persistence keeps only Square identity and non-PII fulfillment state", () => {
  assert.deepEqual(guestOrderReference("customer-1"),{squareCustomerId:"customer-1"});
  assert.deepEqual(guestFulfillmentReference({type:"delivery",scheduledAt:"2026-09-14T14:00:00.000Z",recipient:{displayName:"Ada",email:"ada@example.com"},address:{addressLine1:"1 Main"}}),{type:"delivery",scheduledAt:"2026-09-14T14:00:00.000Z"});
});

test("account creation claims guest orders and clears the local guest reference", async () => {
  let query;
  const client={query:async(text,values)=>{query={text,values};return {rowCount:2};}};
  assert.equal(await attachGuestOrders(client,"tenant-1","user-1",["customer-1"],"guest@example.com"),2);
  assert.match(query.text,/guest_contact=NULL/);
  assert.deepEqual(query.values,["tenant-1","user-1",["customer-1"],"guest@example.com"]);
});
