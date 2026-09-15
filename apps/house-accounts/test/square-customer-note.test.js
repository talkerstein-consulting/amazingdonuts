import test from "node:test";
import assert from "node:assert/strict";
import { institutionalAccountNote, institutionalPinNote, syncInstitutionalAccountBalance, syncInstitutionalBalanceNote, syncInstitutionalPinByEmail, syncInstitutionalPinNote } from "../apps/api/square-customer-note.js";

test("adds an institutional PIN without removing staff notes", () => {
  assert.equal(institutionalPinNote("Prefers email contact.", "4826"), "Prefers email contact.\nInstitutional authorization PIN: 4826");
});

test("replaces the managed PIN line after a reset", () => {
  assert.equal(
    institutionalPinNote("Prefers email contact.\nInstitutional authorization PIN: 4826\nLeave at front desk.", "7391"),
    "Prefers email contact.\nLeave at front desk.\nInstitutional authorization PIN: 7391"
  );
});

test("syncs the PIN with the current Square customer version", async () => {
  const updates = [];
  const square = {
    retrieveCustomer: async () => ({ customer: { note:"Staff note", version:7 } }),
    updateCustomer: async (id, body) => updates.push({ id, body })
  };
  await syncInstitutionalPinNote(square, "customer-1", "2468");
  assert.deepEqual(updates, [{ id:"customer-1", body:{ note:"Staff note\nInstitutional authorization PIN: 2468", version:7 } }]);
});

test("syncs a reset PIN to every exact-email Square customer",async()=>{
  const updates=[],square={
    searchCustomers:async input=>{assert.equal(input.query.filter.email_address.exact,"buyer@example.com");return {customers:[{id:"customer-1"},{id:"customer-2"},{id:"customer-1"}]};},
    retrieveCustomer:async id=>({customer:{note:`${id} note`,version:2}}),
    updateCustomer:async(id,body)=>updates.push({id,body})
  };
  const customerIds=await syncInstitutionalPinByEmail(square,"Buyer@Example.com","7391",["organization","customer-1"]);
  assert.deepEqual(customerIds,["organization","customer-1","customer-2"]);
  assert.deepEqual(updates.map(update=>update.id).sort(),["customer-1","customer-2","organization"]);
  assert.ok(updates.every(update=>update.body.note.endsWith("Institutional authorization PIN: 7391")));
});

test("prints available credit directly after the PIN",()=>{
  assert.equal(institutionalAccountNote("Staff note\nInstitutional authorization PIN: 2468",{available:93333}),"Staff note\nInstitutional authorization PIN: 2468\nInstitutional available credit: $933.33");
});

test("updating a PIN preserves and reorders the managed balance line",()=>{
  assert.equal(institutionalPinNote("Institutional available credit: $500.00\nStaff note\nInstitutional authorization PIN: 1111","2222"),"Staff note\nInstitutional authorization PIN: 2222\nInstitutional available credit: $500.00");
});

test("syncs available credit without losing the PIN",async()=>{
  const updates=[],square={retrieveCustomer:async()=>({customer:{note:"Institutional authorization PIN: 2468",version:8}}),updateCustomer:async(id,body)=>updates.push({id,body})};
  await syncInstitutionalBalanceNote(square,"customer-1",12500);
  assert.deepEqual(updates,[{id:"customer-1",body:{note:"Institutional authorization PIN: 2468\nInstitutional available credit: $125.00",version:8}}]);
});

test("syncs the shared balance to the organization and every active purchaser",async()=>{
  const updates=[],pool={query:async(sql)=>sql.includes("array_remove")?{rowCount:1,rows:[{currency:"CAD",square_customer_id:"house",purchaser_customer_ids:["buyer","house"]}]}:{rowCount:1,rows:[{credit_limit:100000,balance:25000,reserved:5000}]}},square={retrieveCustomer:async(id)=>({customer:{note:`${id} note\nInstitutional authorization PIN: 2468`,version:1}}),updateCustomer:async(id,body)=>updates.push({id,body})};
  const credit=await syncInstitutionalAccountBalance(pool,square,"account-1");
  assert.equal(credit.available,70000);
  assert.deepEqual(updates.map(update=>update.id).sort(),["buyer","house"]);
  assert.ok(updates.every(update=>update.body.note.endsWith("Institutional available credit: $700.00")));
});
