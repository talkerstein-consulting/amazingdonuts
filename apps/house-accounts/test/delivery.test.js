import test from "node:test";
import assert from "node:assert/strict";
import { deliveryConfig, deliveryFee, deliveryServiceCharge, merchandiseSubtotal, validateDelivery, validateFridayOnlyItems, validateFulfillmentSchedule } from "../apps/api/delivery.js";

const address = { postalCode: "M6A 2T9" };
const policy = deliveryConfig({});

test("free delivery starts at $200 even when an old setting disables it", () => {
  const configured = deliveryConfig({ DELIVERY_FREE_THRESHOLD: "0" });
  assert.equal(configured.freeThreshold, 20000);
  assert.equal(deliveryFee(19999, { type: "delivery", address }, configured), 1500);
  assert.equal(deliveryFee(20000, { type: "delivery", address }, configured), 0);
});

test("Friday-only products can be purchased earlier but fulfilled only on a Toronto Friday", () => {
  const items = [{ name: "Challah - Six Braid (Friday Only)", quantity: 1 }];
  const friday = { type: "pickup", scheduledAt: "2026-09-18T13:00:00Z" };
  const thursdayToronto = { type: "delivery", scheduledAt: "2026-09-18T02:00:00Z" };
  assert.doesNotThrow(() => validateFridayOnlyItems(items, friday));
  assert.throws(() => validateFridayOnlyItems(items, thursdayToronto), { code: "FRIDAY_ONLY_FULFILLMENT" });
  assert.throws(() => validateFridayOnlyItems(items, { type: "pickup", scheduledAt: "2026-09-22T13:00:00Z" }), { code: "FRIDAY_ONLY_FULFILLMENT" });
  assert.doesNotThrow(() => validateFridayOnlyItems([{ name: "Plain Challah", quantity: 1 }], thursdayToronto));
});

test("accepts configured Toronto delivery postal prefixes", () => {
  assert.doesNotThrow(() => validateDelivery({ type: "delivery", address }, policy));
});

test("rejects addresses outside the configured delivery area", () => {
  assert.throws(() => validateDelivery({ type: "delivery", address: { postalCode: "M1B 1B1" } }, policy), { code: "OUTSIDE_DELIVERY_ZONE" });
});

test("charges the configured postal tier regardless of courier", () => {
  assert.equal(deliveryFee(5000, { type: "delivery", address }, policy), 1500);
  assert.equal(deliveryFee(10000, { type: "delivery", address:{postalCode:"M4V 2T9"} }, policy), 2500);
  assert.equal(deliveryFee(10000, { type: "delivery", address:{postalCode:"M5V 2T9"} }, policy), 4500);
});

test("documented delivery zones use only the four Square service-charge tiers", () => {
  assert.deepEqual([...new Set(Object.values(policy.feeTiers))].sort((a,b)=>a-b),[1500,2000,2500,4500]);
  for (const [postalCode,amount] of [["L4J 7A9",1500],["M2M 1A1",2000],["M3H 2A2",2500],["L6A 1A1",4500]]) {
    assert.equal(deliveryFee(5000,{type:"delivery",address:{postalCode}},policy),amount);
  }
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
  const object={id:"SQUARE_DELIVERY_15",type:"SERVICE_CHARGE",service_charge_data:{name:"Delivery – $15",amount_money:{amount:1500,currency:"CAD"},taxable:true}};
  const charge=deliveryServiceCharge(1500,[object],"LOCATION")[0];
  assert.equal(charge.calculation_phase, "SUBTOTAL_PHASE");
  assert.equal(charge.taxable, true);
  assert.equal(charge.catalog_object_id, object.id);
  assert.equal(charge.amount_money, undefined);
  assert.deepEqual(deliveryServiceCharge(0,[],"LOCATION"),[]);
  assert.throws(()=>deliveryServiceCharge(4000,[object],"LOCATION"),{code:"DELIVERY_CHARGE_UNAVAILABLE"});
  assert.throws(()=>deliveryServiceCharge(1500,[{...object,is_deleted:true}],"LOCATION"),{code:"DELIVERY_CHARGE_UNAVAILABLE"});
});

test("accepts 30-minute pickup and delivery windows", () => {
  const now = new Date("2026-09-01T00:00:00Z");
  assert.doesNotThrow(() => validateFulfillmentSchedule({ type:"pickup", scheduledAt: "2026-09-30T11:30:00Z" }, policy, now));
  assert.doesNotThrow(() => validateFulfillmentSchedule({ type:"pickup", scheduledAt: "2026-09-30T19:30:00Z" }, policy, now));
  assert.doesNotThrow(() => validateFulfillmentSchedule({ type:"delivery", scheduledAt: "2026-09-30T10:30:00Z" }, policy, now));
  assert.doesNotThrow(() => validateFulfillmentSchedule({ type:"delivery", scheduledAt: "2026-09-30T20:00:00Z" }, policy, now));
});

test("accepts published opening and closing times in both Toronto daylight and standard time", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  assert.doesNotThrow(() => validateFulfillmentSchedule({ type:"pickup", scheduledAt: "2026-07-06T11:30:00Z" }, policy, now));
  assert.doesNotThrow(() => validateFulfillmentSchedule({ type:"pickup", scheduledAt: "2026-07-06T19:30:00Z" }, policy, now));
  assert.doesNotThrow(() => validateFulfillmentSchedule({ type:"pickup", scheduledAt: "2026-12-07T12:30:00Z" }, policy, now));
  assert.doesNotThrow(() => validateFulfillmentSchedule({ type:"pickup", scheduledAt: "2026-12-07T20:30:00Z" }, policy, now));
});

test("rejects fulfillment outside Toronto business hours", () => {
  const now = new Date("2026-09-01T00:00:00Z");
  assert.throws(() => validateFulfillmentSchedule({ type:"pickup", scheduledAt: "2026-09-30T11:00:00Z" }, policy, now), { code: "OUTSIDE_FULFILLMENT_HOURS" });
  assert.throws(() => validateFulfillmentSchedule({ type:"pickup", scheduledAt: "2026-09-30T20:00:00Z" }, policy, now), { code: "OUTSIDE_FULFILLMENT_HOURS" });
  assert.throws(() => validateFulfillmentSchedule({ type:"delivery", scheduledAt: "2026-10-03T15:00:00Z" }, policy, now), { code: "OUTSIDE_FULFILLMENT_HOURS" });
});

test("rejects fulfillment times outside configured intervals", () => {
  assert.throws(() => validateFulfillmentSchedule({ type:"pickup", scheduledAt: "2026-09-30T15:15:00Z" }, policy, new Date("2026-09-01T00:00:00Z")), { code: "INVALID_FULFILLMENT_INTERVAL" });
  const custom = deliveryConfig({ FULFILLMENT_INTERVAL_MINUTES:"15" });
  assert.doesNotThrow(() => validateFulfillmentSchedule({ type:"pickup", scheduledAt: "2026-09-30T15:15:00Z" }, custom, new Date("2026-09-01T00:00:00Z")));
});

test("ASAP allows a 10-minute preparation time within hours without relaxing scheduled slots", () => {
  const now = new Date("2026-09-30T14:00:00Z");
  assert.doesNotThrow(() => validateFulfillmentSchedule({ type:"pickup", asap:true, scheduledAt:"2026-09-30T14:11:00Z" }, policy, now));
  assert.doesNotThrow(() => validateFulfillmentSchedule({ type:"delivery", asap:true, scheduledAt:"2026-09-30T14:11:00Z" }, policy, now));
  assert.throws(() => validateFulfillmentSchedule({ type:"pickup", asap:true, scheduledAt:"2026-09-30T14:09:00Z" }, policy, now), { code:"INVALID_ASAP_TIME" });
  assert.throws(() => validateFulfillmentSchedule({ type:"pickup", asap:true, scheduledAt:"2026-09-30T15:11:00Z" }, policy, now), { code:"INVALID_ASAP_TIME" });
  assert.throws(() => validateFulfillmentSchedule({ type:"delivery", asap:true, scheduledAt:"2026-09-30T20:25:00Z" }, policy, new Date("2026-09-30T20:13:00Z")), { code:"OUTSIDE_FULFILLMENT_HOURS" });
  assert.throws(() => validateFulfillmentSchedule({ type:"pickup", scheduledAt:"2026-09-30T14:11:00Z" }, policy, now), { code:"INVALID_FULFILLMENT_INTERVAL" });
});
