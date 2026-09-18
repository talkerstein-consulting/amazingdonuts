import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../apps/api/app.js";
import { deliveryConfig } from "../apps/api/delivery.js";

test("signed-in print quotes accept a four-dozen assignment before artwork upload", async t => {
  const date = new Date(Date.now() + 9 * 86400000);
  while (date.getUTCDay() !== 1) date.setUTCDate(date.getUTCDate() + 1);
  date.setUTCHours(14, 0, 0, 0);
  const drafts = [];
  const square = { request: async (path, options) => {
    if (path === "/v2/catalog/list") return { objects: [{
      type: "ITEM", id: "PRINT", item_data: { name: "Twelve Custom Printed Donuts", variations: [{
        id: "PRINT-VAR", item_variation_data: { price_money: { amount: 4500, currency: "CAD" }, location_overrides: [] }
      }] }
    }] };
    assert.equal(path, "/v2/orders/calculate");
    drafts.push(options.body.order);
    return { order: { ...options.body.order, total_money: { amount: 18000, currency: "CAD" } } };
  } };
  const pool = { query: async sql => {
    assert.match(sql, /FROM sessions/);
    return { rows: [{ id: "CUSTOMER", tenant_id: "TENANT" }], rowCount: 1 };
  } };
  const app = createApp({ pool, square, config: { squareLocationId: "LOCATION", delivery: deliveryConfig({}) } });
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const body = {
    items: [{ name: "Twelve Custom Printed Donuts", quantity: 4 }],
    customizations: [{ productName: "Twelve Custom Printed Donuts", kind: "print", icingFlavour: "Chocolate", sprinkleColours: "Chocolate", artworks: [{ count: 4 }] }],
    fulfillment: { type: "pickup", scheduledAt: date.toISOString(), recipient: { displayName: "Test Customer", email: "test@example.com", phone: "4165550123" } }
  };
  const quote = await fetch(`http://127.0.0.1:${server.address().port}/api/storefront/quote`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: "house_session=test" }, body: JSON.stringify(body)
  });
  assert.equal(quote.status, 200, await quote.text());
  assert.equal(drafts[0].line_items[0].quantity, "4");
  assert.match(drafts[0].line_items[0].note, /Design 1 x 4 dozen units/);

  body.customizations[0].artworks = [{ count: 3 }];
  const invalid = await fetch(`http://127.0.0.1:${server.address().port}/api/storefront/quote`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: "house_session=test" }, body: JSON.stringify(body)
  });
  assert.equal(invalid.status, 409);
  assert.equal((await invalid.json()).error.code, "PRINT_ARTWORK_REQUIRED");
});

test("custom print uploads accept JPEG files only", async t => {
  const saved = [];
  const pool = { query: async (sql, values) => {
    if (sql.includes("FROM sessions")) return { rows: [{ id: "CUSTOMER", tenant_id: "TENANT" }], rowCount: 1 };
    if (sql.includes("INSERT INTO custom_order_assets")) {
      saved.push(values);
      return { rows: [{ id: "ASSET", file_name: values[2], mime_type: values[3] }], rowCount: 1 };
    }
    throw new Error(`Unexpected query: ${sql}`);
  } };
  const app = createApp({ pool, square: {}, config: {} });
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/storefront/custom-assets`;
  const upload = (fileName, mime, bytes) => fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "house_session=test" },
    body: JSON.stringify({ fileName, dataUrl: `data:${mime};base64,${bytes.toString("base64")}` })
  });
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

  assert.equal((await upload("design.png", "image/png", png)).status, 400);
  assert.equal((await upload("design.png", "image/jpeg", jpeg)).status, 400);
  assert.equal((await upload("design.jpg", "image/jpeg", png)).status, 400);
  assert.equal((await upload("design.jpeg", "image/jpeg", jpeg)).status, 201);
  assert.equal(saved.length, 1);
  assert.equal(saved[0][3], "image/jpeg");
});
