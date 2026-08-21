import assert from "node:assert/strict";
import test from "node:test";
import { resolveWebhookOrder } from "../db/webhooks.js";
import { verifySquareWebhook } from "../square/webhooks.js";

test("verifies Square's documented webhook signature vector", () => {
  assert.equal(
    verifySquareWebhook({
      notificationUrl: "https://example.com/webhook",
      signatureKey: "asdf1234",
      body: '{"hello":"world"}',
      signature: "2kRE5qRU2tR+tBGlDwMEw2avJ7QM4ikPYD/PJ3bd9Og="
    }),
    true
  );
});

test("rejects an altered webhook body", () => {
  assert.equal(
    verifySquareWebhook({
      notificationUrl: "https://example.com/webhook",
      signatureKey: "asdf1234",
      body: '{"hello":"tampered"}',
      signature: "2kRE5qRU2tR+tBGlDwMEw2avJ7QM4ikPYD/PJ3bd9Og="
    }),
    false
  );
});

test("hydrates referenced Square orders before projecting webhooks", async () => {
  const calls = [];
  const order = await resolveWebhookOrder(
    { data: { object: { order_updated: { order_id: "ORDER_1", version: 2 } } } },
    {
      retrieveOrder: async (orderId) => {
        calls.push(orderId);
        return { order: { id: orderId, location_id: "LOC_1", state: "OPEN" } };
      }
    }
  );
  assert.deepEqual(calls, ["ORDER_1"]);
  assert.equal(order.location_id, "LOC_1");
});
