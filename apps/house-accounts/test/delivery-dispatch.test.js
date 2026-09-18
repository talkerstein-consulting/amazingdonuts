import test from "node:test";
import assert from "node:assert/strict";
import { assertLocalStatusTransition, createDispatchCapability, createDriverCapability, deliveryStatusLabel, dispatchTokenHash, normalizedDeliveryStatus, withDispatchInstructions } from "../apps/api/delivery-dispatch.js";

test("dispatch capabilities store a hash and point to the single-order screen", () => {
  const capability=createDispatchCapability("https://amazing-donuts.vercel.app","2026-09-20T14:00:00Z");
  assert.match(capability.url,/^https:\/\/amazing-donuts\.vercel\.app\/admin-dashboard\/\?dispatch=/);
  assert.notEqual(capability.tokenHash,capability.token);
  assert.equal(capability.tokenHash,dispatchTokenHash(capability.token));
  assert.ok(capability.expiresAt>new Date("2026-09-20T14:00:00Z"));
});

test("driver capabilities are distinct, hashed, and use the restricted driver screen", () => {
  const capability=createDriverCapability("https://amazing-donuts.vercel.app","2026-09-20T14:00:00Z");
  assert.match(capability.url,/^https:\/\/amazing-donuts\.vercel\.app\/admin-dashboard\/\?driver=/);
  assert.notEqual(capability.tokenHash,capability.token);
  assert.equal(capability.tokenHash,dispatchTokenHash(capability.token));
  assert.ok(capability.expiresAt>new Date("2026-09-20T14:00:00Z"));
});

test("Square instructions retain customer notes and include the staff dispatch URL", () => {
  const fulfillment=withDispatchInstructions({type:"delivery",deliveryInstructions:"Leave at reception."},"https://example.com/dispatch");
  assert.match(fulfillment.deliveryInstructions,/Leave at reception\./);
  assert.match(fulfillment.deliveryInstructions,/STAFF DELIVERY DISPATCH: https:\/\/example\.com\/dispatch/);
  assert.ok(fulfillment.deliveryInstructions.length<=500);
});

test("Uber events map to the same four customer-facing stages", () => {
  assert.equal(normalizedDeliveryStatus("uber_direct","pickup"),"dispatching_soon");
  assert.equal(normalizedDeliveryStatus("uber_direct","dropoff"),"out_for_delivery");
  assert.equal(normalizedDeliveryStatus("uber_direct","dropoff_imminent"),"arriving_soon");
  assert.equal(normalizedDeliveryStatus("uber_direct","arrived_at_dropoff"),"arriving_soon");
  assert.equal(normalizedDeliveryStatus("uber_direct","completed"),"delivered");
  assert.equal(deliveryStatusLabel("uber_direct","delivered"),"Delivered");
});

test("local delivery status can advance but cannot move backwards", () => {
  assert.doesNotThrow(()=>assertLocalStatusTransition("dispatching_soon","arriving_soon"));
  assert.throws(()=>assertLocalStatusTransition("arriving_soon","out_for_delivery"),{code:"DELIVERY_STATUS_REGRESSION"});
});
