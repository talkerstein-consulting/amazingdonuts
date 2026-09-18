import test from "node:test";
import assert from "node:assert/strict";
import { DONUT_BOXES, boxCustomizationSchema, squareBoxLines } from "../apps/api/donut-boxes.js";
import { buildSquareOrder, createApp } from "../apps/api/app.js";
import { deliveryConfig } from "../apps/api/delivery.js";

const fulfillment = { type: "pickup", scheduledAt: "2026-10-05T14:00:00Z", recipient: { displayName: "Test Customer", email: "test@example.com", phone: "4165550123" } };
const item = (name, id, amount = 200) => ({ type: "ITEM", id, item_data: { name, variations: [{ id: `${id}-VAR`, item_variation_data: { price_money: { amount, currency: "CAD" }, location_overrides: [] } }] } });

function fixture(box = DONUT_BOXES[0]) {
  const objects = [item("Glazed Donut", "GLAZED", 200), item("Chocolate Marble Donut", "CHOCOLATE", 250)];
  const custom = { productName: box.name, kind: "box", donuts: Array.from({ length: box.size }, (_, index) => objects[index % 2].item_data.name) };
  return { box, custom, objects };
}

for (const box of DONUT_BOXES) {
  test(`${box.size}-donut builder sends normal Square items at their catalog prices`, async () => {
    const { custom, objects } = fixture(box);
    assert.deepEqual(boxCustomizationSchema.parse(custom), custom);
    assert.deepEqual(squareBoxLines(custom, 2, objects, "LOCATION").map(line => ({ id: line.catalog_object_id, quantity: line.quantity })), [
      { id: "GLAZED-VAR", quantity: String(box.size) },
      { id: "CHOCOLATE-VAR", quantity: String(box.size) }
    ]);
    const order = await buildSquareOrder({ request: async path => { assert.equal(path, "/v2/catalog/list"); return { objects }; } }, "LOCATION", {
      items: [{ name: box.name, quantity: 2 }], customizations: [custom], fulfillment
    }, null);
    assert.equal(order.line_items.length, 2);
    assert.ok(order.line_items.every(line => !line.modifiers && !line.base_price_money));
  });
}

test("rejects incomplete, oversized, missing, and wrong-kind box selections", () => {
  const { custom, objects } = fixture();
  for (const invalid of [undefined, { ...custom, kind: "glyph" }, { ...custom, donuts: custom.donuts.slice(1) }, { ...custom, donuts: [...custom.donuts, "Glazed Donut"] }]) {
    assert.throws(() => squareBoxLines(invalid, 1, objects, "LOCATION"), { code: "BOX_SELECTION_REQUIRED" });
  }
});

test("two boxes retain their selections as ordinary Square item lines", async () => {
  const { box, custom, objects } = fixture();
  const selections = ["Glazed Donut", "Chocolate Marble Donut"].map(name => ({ ...custom, donuts: Array(box.size).fill(name) }));
  const order = await buildSquareOrder({ request: async () => ({ objects }) }, "LOCATION", {
    items: selections.map(() => ({ name: box.name, quantity: 1 })), customizations: selections, fulfillment
  }, null);
  assert.deepEqual(order.line_items.map(line => ({ id: line.catalog_object_id, quantity: line.quantity })), [
    { id: "GLAZED-VAR", quantity: "6" },
    { id: "CHOCOLATE-VAR", quantity: "6" }
  ]);
});

test("rejects deleted, sold-out, special-order, expensive, and missing flavours", () => {
  for (const change of [
    ({ custom }) => { custom.donuts[0] = "Missing Donut"; },
    ({ objects }) => { objects[0].is_deleted = true; },
    ({ objects }) => { objects[0].item_data.variations[0].item_variation_data.location_overrides = [{ location_id: "LOCATION", sold_out: true }]; },
    ({ objects }) => { objects[0].item_data.name = "Glazed Donut (special order)"; },
    ({ objects }) => { objects[0].item_data.variations[0].item_variation_data.price_money.amount = 7500; }
  ]) {
    const data = fixture(); change(data);
    assert.throws(() => squareBoxLines(data.custom, 1, data.objects, "LOCATION"), { code: "BOX_FLAVOUR_UNAVAILABLE" });
  }
});

test("guest and signed-in quote endpoints price expanded Square item lines", async t => {
  const { box, custom, objects } = fixture();
  const drafts = [];
  const square = { request: async (path, options) => {
    if (path === "/v2/catalog/list") return { objects };
    assert.equal(path, "/v2/orders/calculate");
    drafts.push(options.body.order);
    return { order: { ...options.body.order, total_money: { amount: 1350, currency: "CAD" } } };
  } };
  const pool = { query: async sql => {
    if (sql.includes("FROM sessions")) return { rows: [{ id: "CUSTOMER", tenant_id: "TENANT" }], rowCount: 1 };
    assert.match(sql, /SELECT id FROM tenants/);
    return { rows: [{ id: "TENANT" }], rowCount: 1 };
  } };
  const app = createApp({ pool, square, config: { squareLocationId: "LOCATION", delivery: deliveryConfig({}) } });
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  for (const path of ["/api/public/storefront/quote", "/api/storefront/quote"]) {
    const body = { items: [{ name: box.name, quantity: 1 }], customizations: [custom], fulfillment };
    const headers = { "Content-Type": "application/json", ...(path === "/api/storefront/quote" ? { Cookie: "house_session=test" } : {}) };
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
    assert.equal(response.status, 200, await response.text());
    assert.equal(drafts.at(-1).taxes, undefined);
    assert.equal(drafts.at(-1).pricing_options.auto_apply_taxes, true);
    assert.deepEqual(drafts.at(-1).line_items.map(line => line.catalog_object_id), ["GLAZED-VAR", "CHOCOLATE-VAR"]);
    assert.ok(drafts.at(-1).line_items.every(line => !line.modifiers));
    body.customizations = [];
    const rejected = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
    assert.equal(rejected.status, 409);
    assert.equal((await rejected.json()).error.code, "BOX_SELECTION_REQUIRED");
  }
});
