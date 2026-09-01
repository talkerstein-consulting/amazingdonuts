import test from "node:test";
import assert from "node:assert/strict";
import { assertCreditAvailable, statementTotals, summarizeLedger } from "../packages/ledger/index.js";
import { institutionalOrderStatus } from "../apps/api/ledger.js";

test("calculates posted, reserved, and available credit without a mutable balance",()=>{
  const credit=summarizeLedger([{amount:42500},{amount:18500},{amount:-10000}],[{amount:12000,status:"active"},{amount:9000,status:"released"}],100000);
  assert.deepEqual(credit,{creditLimit:100000,postedBalance:51000,reserved:12000,available:37000});
});

test("rejects an order that would exceed available credit",()=>{
  assert.throws(()=>assertCreditAvailable({available:9999},10000),error=>error.code==="CREDIT_LIMIT_EXCEEDED"&&error.details.available===9999);
});

test("statement totals preserve opening balance and apply credits once",()=>{
  assert.deepEqual(statementTotals([{amount:20000},{amount:5000},{amount:-8000}],12000),{openingBalance:12000,charges:25000,credits:8000,closingBalance:29000});
});

test("maps completed Square payments to a valid posted ledger order",()=>{
  assert.equal(institutionalOrderStatus("COMPLETED"),"posted");
  assert.equal(institutionalOrderStatus("CANCELED"),"cancelled");
  assert.equal(institutionalOrderStatus("unexpected"),"review");
});
