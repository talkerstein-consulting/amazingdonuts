import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword } from "../apps/api/auth.js";
import { assertHouseAuthorization } from "../apps/api/app.js";

test("accepts the purchaser PIN before the organization PIN",async()=>{
  const purchaserPinHash=await hashPassword("2468"),accountPinHash=await hashPassword("1357");
  await assert.doesNotReject(()=>assertHouseAuthorization({inputPin:"2468",purchaserPinHash,accountPinHash,total:1200}));
  await assert.rejects(()=>assertHouseAuthorization({inputPin:"1357",purchaserPinHash,accountPinHash,total:1200}),error=>error.code==="INVALID_AUTHORIZATION_PIN");
});

test("falls back to the organization PIN when no personal PIN exists",async()=>{
  const accountPinHash=await hashPassword("1357");
  await assert.doesNotReject(()=>assertHouseAuthorization({inputPin:"1357",accountPinHash,total:1200}));
});

test("enforces per-order and billing-period spending limits",async()=>{
  const accountPinHash=await hashPassword("1357");
  await assert.rejects(()=>assertHouseAuthorization({inputPin:"1357",accountPinHash,total:5100,purchaseLimit:5000}),error=>error.code==="PURCHASER_LIMIT_EXCEEDED");
  await assert.rejects(()=>assertHouseAuthorization({inputPin:"1357",accountPinHash,total:2100,periodSpent:8000,periodSpendLimit:10000,periodFrequency:"weekly"}),error=>error.code==="PERIOD_SPEND_LIMIT_EXCEEDED");
});
