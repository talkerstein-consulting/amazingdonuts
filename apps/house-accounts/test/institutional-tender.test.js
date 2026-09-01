import test from "node:test";
import assert from "node:assert/strict";
import { isInstitutionalTender } from "../apps/worker/process-square.js";

test("accepts only the configured institutional custom payment method",()=>{
  assert.equal(isInstitutionalTender({source_type:"EXTERNAL",external_details:{source:"Amazing Donuts Account"}}),true);
  assert.equal(isInstitutionalTender({source_type:"EXTERNAL",external_details:{source:"Other Gift Card or Certificate"}}),false);
  assert.equal(isInstitutionalTender({source_type:"EXTERNAL",external_details:{source:"DoorDash"}}),false);
  assert.equal(isInstitutionalTender({source_type:"CARD"}),false);
});

test("matches the configured tender name without case sensitivity",()=>{
  const payment={source_type:"EXTERNAL",external_details:{source:"INSTITUTIONAL CREDIT"}};
  assert.equal(isInstitutionalTender(payment,["Institutional Credit"]),true);
});
