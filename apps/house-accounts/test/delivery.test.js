import test from "node:test";
import assert from "node:assert/strict";
import { deliveryConfig, deliveryFee, deliveryServiceCharge, merchandiseSubtotal, validateDelivery, validateFulfillmentSchedule } from "../apps/api/delivery.js";

const address = { postalCode: "M6A 2T9" };
const policy = deliveryConfig({});

test("accepts configured Toronto delivery postal prefixes", () => {
  assert.doesNotThrow(() => validateDelivery({ type: "delivery", address }, policy));
});

test("rejects addresses outside the configured delivery area", () => {
  assert.throws(() => validateDelivery({ type: "delivery", address: { postalCode: "M1B 1B1" } }, policy), { code: "OUTSIDE_DELIVERY_ZONE" });
});

test("charges five dollars and makes delivery free at one hundred dollars", () => {
  assert.equal(deliveryFee(5000, { type: "delivery" }, policy), 500);
  assert.equal(deliveryFee(10000, { type: "delivery" }, policy), 0);
});

test("enforces the delivery merchandise minimum", () => {
  assert.throws(() => deliveryFee(2499, { type: "delivery" }, policy), { code: "DELIVERY_MINIMUM" });
});

test("sums Square line items when subtotal_money is absent", () => {
  assert.equal(merchandiseSubtotal({ line_items: [
    { total_money: { amount: 2000 } },
    { total_money: { amount: 600 } },
  ] }), 2600);
});

test("uses Square's taxable service-charge phase", () => {
  assert.equal(deliveryServiceCharge(500)[0].calculation_phase, "SUBTOTAL_PHASE");
  assert.equal(deliveryServiceCharge(500)[0].taxable, true);
});

test("accepts 15-minute fulfillment slots during Toronto business hours", () => {
  const now = new Date("2026-09-01T00:00:00Z");
  assert.doesNotThrow(() => validateFulfillmentSchedule({ scheduledAt: "2026-09-30T11:30:00Z" }, now));
  assert.doesNotThrow(() => validateFulfillmentSchedule({ scheduledAt: "2026-09-30T20:00:00Z" }, now));
  assert.doesNotThrow(() => validateFulfillmentSchedule({ scheduledAt: "2026-10-02T18:00:00Z" }, now));
});

test("accepts published opening and closing times in both Toronto daylight and standard time", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  assert.doesNotThrow(() => validateFulfillmentSchedule({ scheduledAt: "2026-07-06T11:30:00Z" }, now));
  assert.doesNotThrow(() => validateFulfillmentSchedule({ scheduledAt: "2026-07-06T20:00:00Z" }, now));
  assert.doesNotThrow(() => validateFulfillmentSchedule({ scheduledAt: "2026-12-07T12:30:00Z" }, now));
  assert.doesNotThrow(() => validateFulfillmentSchedule({ scheduledAt: "2026-12-07T21:00:00Z" }, now));
});

test("rejects fulfillment outside Toronto business hours", () => {
  const now = new Date("2026-09-01T00:00:00Z");
  assert.throws(() => validateFulfillmentSchedule({ scheduledAt: "2026-09-30T11:15:00Z" }, now), { code: "OUTSIDE_FULFILLMENT_HOURS" });
  assert.throws(() => validateFulfillmentSchedule({ scheduledAt: "2026-09-30T20:15:00Z" }, now), { code: "OUTSIDE_FULFILLMENT_HOURS" });
  assert.throws(() => validateFulfillmentSchedule({ scheduledAt: "2026-10-03T15:00:00Z" }, now), { code: "OUTSIDE_FULFILLMENT_HOURS" });
});

test("rejects fulfillment times outside 15-minute intervals", () => {
  assert.throws(() => validateFulfillmentSchedule({ scheduledAt: "2026-09-30T15:07:00Z" }, new Date("2026-09-01T00:00:00Z")), { code: "INVALID_FULFILLMENT_INTERVAL" });
});
