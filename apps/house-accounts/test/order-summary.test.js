import assert from "node:assert/strict";
import test from "node:test";
import { orderFulfillmentSummary, orderPaymentSummary } from "../../../src/lib/order-summary.ts";

test("order fulfillment summary uses a concise Toronto-local timestamp", () => {
  assert.equal(
    orderFulfillmentSummary({
      fulfillment: { type: "delivery" },
      scheduledAt: "2026-09-16T13:00:00.000Z",
    }),
    "Delivery: Sep 16, 2026, 9:00 a.m.",
  );
});

test("order payment summary uses customer-facing payment labels", () => {
  assert.equal(orderPaymentSummary({ payment_method: "house_account", paymentStatus: "On account" }), "Paid on account");
  assert.equal(orderPaymentSummary({ payment_method: "card", paymentStatus: "Paid" }), "Paid via Credit Card");
  assert.equal(orderPaymentSummary({ payment_method: "card", paymentStatus: "Paid", source: "in_store" }), "Paid In-Store");
  assert.equal(orderPaymentSummary({ payment_method: "cash", paymentStatus: "Paid" }), "Paid In-Store");
});

test("order payment summary preserves exceptional payment states", () => {
  assert.equal(orderPaymentSummary({ payment_method: "card", paymentStatus: "Refunded" }), "Refunded");
  assert.equal(orderPaymentSummary({ payment_method: "card", paymentStatus: "Payment processing" }), "Payment processing");
});
