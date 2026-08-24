import test from "node:test";
import assert from "node:assert/strict";
import { deliveryConfig, deliveryFee, validateDelivery } from "../apps/api/delivery.js";

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
