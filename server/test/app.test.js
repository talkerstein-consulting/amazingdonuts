import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../app.js";

const config = {
  APP_ORIGIN: "http://localhost:5173",
  SQUARE_ENVIRONMENT: "sandbox",
  SQUARE_LOCATION_ID: "LOC_1",
  SQUARE_WEBHOOK_NOTIFICATION_URL: "https://example.com/api/webhooks/square",
  SQUARE_WEBHOOK_SIGNATURE_KEY: "test-key",
  CHECKOUT_REDIRECT_URL: "http://localhost:5173/order-confirmation",
  ALLOW_TIPPING: true,
  ENABLE_DELIVERY: false,
  PREP_TIME_MINUTES: 30,
  MIN_ORDER_LEAD_MINUTES: 60,
  MAX_ORDER_ADVANCE_DAYS: 30
};

test("serves health and filtered Square locations", async (context) => {
  const app = createApp({
    config,
    pool: { query: async () => ({ rows: [{ ok: 1 }] }) },
    square: {
      listLocations: async () => ({
        locations: [
          { id: "LOC_1", name: "Bathurst", status: "ACTIVE", timezone: "America/Toronto" },
          { id: "LOC_2", name: "Other", status: "ACTIVE", timezone: "America/Toronto" }
        ]
      })
    }
  });
  const server = app.listen(0);
  context.after(() => server.close());
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  const health = await fetch(`http://127.0.0.1:${port}/api/health`).then((response) => response.json());
  const locations = await fetch(`http://127.0.0.1:${port}/api/locations`).then((response) => response.json());

  assert.equal(health.ok, true);
  assert.deepEqual(locations.locations.map((location) => location.id), ["LOC_1"]);
});
