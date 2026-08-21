import assert from "node:assert/strict";
import test from "node:test";
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
