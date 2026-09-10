import test from "node:test";
import assert from "node:assert/strict";
import { DONUT_BOXES, boxCustomizationSchema, boxModifierListName, boxModifiers, squareBoxSelection } from "../apps/api/donut-boxes.js";
import { buildSquareOrder, createApp } from "../apps/api/app.js";
import { deliveryConfig } from "../apps/api/delivery.js";

function fixture(box = DONUT_BOXES[0]) {
  const item = { type: "ITEM", id: "BOX", item_data: { name: box.name,
    variations: [{ id: "BOX-VARIATION", item_variation_data: { price_money: { amount: box.amount, currency: "CAD" } } }],
    modifier_list_info: [{ modifier_list_id: "FLAVOURS", enabled: true }] } };
  const list = { type: "MODIFIER_LIST", id: "FLAVOURS", modifier_list_data: { name: boxModifierListName(box),
    modifiers: ["Glazed Donut", "Chocolate Marble Donut"].map((name, index) => ({ type: "MODIFIER", id: `FLAVOUR-${index}`,
      modifier_data: { name, price_money: { amount: 0, currency: "CAD" } } })) } };
  const custom = { productName: box.name, kind: "box", donuts: Array.from({ length: box.size }, (_, index) => list.modifier_list_data.modifiers[index % 2].modifier_data.name) };
  return { item, list, custom, objects: [item, list] };
}

for (const box of DONUT_BOXES) {
  test(`${box.size}-donut box sends catalog modifiers with quantities per box`, async () => {
    const { item, custom, objects } = fixture(box);
    assert.deepEqual(boxCustomizationSchema.parse(custom), custom);
    const selection = squareBoxSelection(item, custom, objects, "LOCATION");
    assert.deepEqual(selection.modifiers, [
      { catalog_object_id: "FLAVOUR-0", quantity: String(box.size / 2) },
      { catalog_object_id: "FLAVOUR-1", quantity: String(box.size / 2) }
    ]);
    assert.match(selection.note, new RegExp(`Pack ${box.size} donuts per box`));
    const square = { request: async path => { assert.equal(path, "/v2/catalog/list"); return { objects }; } };
    const input = { items: [{ name: box.name, quantity: 2, price: 1 }], customizations: [custom],
      fulfillment: { type: "pickup", scheduledAt: "2026-09-10T13:00:00Z", recipient: { displayName: "Test Customer", email: "test@example.com", phone: "4165550123" } } };
    const order = await buildSquareOrder(square, "LOCATION", input, null);
    assert.deepEqual(order.line_items, [{ catalog_object_id: "BOX-VARIATION", quantity: "2", ...selection }]);
    assert.equal(order.line_items[0].base_price_money, undefined, "Square must determine the box price");
  });
}

test("rejects incomplete, oversized, missing, and wrong-kind selections", () => {
  const { item, custom, objects } = fixture();
  for (const invalid of [undefined, { ...custom, kind: "glyph" }, { ...custom, donuts: custom.donuts.slice(1) }, { ...custom, donuts: [...custom.donuts, "Glazed Donut"] }]) {
    assert.throws(() => squareBoxSelection(item, invalid, objects, "LOCATION"), { code: "BOX_SELECTION_REQUIRED" });
  }
});

test("two boxes of the same size retain their own flavour selections in Square", async () => {
  const { item, custom, objects } = fixture();
  const selections = ["Glazed Donut", "Chocolate Marble Donut"].map(name => ({ ...custom, donuts: Array(6).fill(name) }));
  const order = await buildSquareOrder({ request: async () => ({ objects }) }, "LOCATION", {
    items: selections.map(() => ({ name: item.item_data.name, quantity: 1 })), customizations: selections,
    fulfillment: { type: "pickup", scheduledAt: "2026-10-05T14:00:00Z", recipient: { displayName: "Test Customer", email: "test@example.com", phone: "4165550123" } }
  }, null);
  assert.deepEqual(order.line_items.map(line => line.modifiers), [[{ catalog_object_id: "FLAVOUR-0", quantity: "6" }], [{ catalog_object_id: "FLAVOUR-1", quantity: "6" }]]);
});

test("rejects flavours not explicitly assigned to this box, including deleted or sold-out modifiers", () => {
  for (const change of [
    ({ custom }) => { custom.donuts[0] = "Twelve Custom Printed Donuts"; },
    ({ list }) => { list.is_deleted = true; },
    ({ item }) => { item.item_data.modifier_list_info[0].enabled = false; },
    ({ list }) => { list.modifier_list_data.modifiers[0].is_deleted = true; },
    ({ list }) => { list.modifier_list_data.modifiers[0].modifier_data.location_overrides = [{ location_id: "LOCATION", sold_out: true }]; }
  ]) {
    const f = fixture(); change(f);
    assert.throws(() => squareBoxSelection(f.item, f.custom, f.objects, "LOCATION"), { code: "BOX_FLAVOUR_UNAVAILABLE" });
  }
});

test("supports repeated flavours without accepting a box customization on individual items", () => {
  const { item, custom, objects } = fixture();
  custom.donuts.fill("Glazed Donut");
  assert.deepEqual(squareBoxSelection(item, custom, objects, "LOCATION").modifiers, [{ catalog_object_id: "FLAVOUR-0", quantity: "6" }]);
  const single = { item_data: { name: "Glazed Donut" } };
  assert.deepEqual(squareBoxSelection(single, undefined, objects, "LOCATION"), {});
  assert.throws(() => squareBoxSelection(single, custom, objects, "LOCATION"), { code: "BOX_ITEM_REQUIRED" });
});

test("a sold-out individual donut cannot be selected through its box modifier", () => {
  const { item, custom, objects } = fixture();
  objects.push({ type: "ITEM", item_data: { name: "Glazed Donut", variations: [{ item_variation_data: {
    price_money: { amount: 200, currency: "CAD" }, location_overrides: [{ location_id: "LOCATION", sold_out: true }]
  } }] } });
  assert.deepEqual(boxModifiers(item, objects, "LOCATION").map(modifier => modifier.modifier_data.name), ["Chocolate Marble Donut"]);
  assert.throws(() => squareBoxSelection(item, custom, objects, "LOCATION"), { code: "BOX_FLAVOUR_UNAVAILABLE" });
});

test("catalog only exposes the box's assigned flavour list at the checkout location", () => {
  const { item, list, objects } = fixture();
  assert.equal(boxModifiers(item, objects, "LOCATION").length, 2);
  list.present_at_all_locations = false;
  list.present_at_location_ids = ["OTHER"];
  assert.deepEqual(boxModifiers(item, objects, "LOCATION"), []);
});

test("guest and signed-in quote endpoints retain and validate box selections", async t => {
  const { custom, objects } = fixture();
  const drafts = [];
  const square = { request: async (path, options) => {
    if (path === "/v2/catalog/list") return { objects };
    assert.equal(path, "/v2/orders/calculate");
    drafts.push(options.body.order);
    return { order: { ...options.body.order, total_money: { amount: 1200, currency: "CAD" } } };
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
  const scheduled = new Date(Date.now() + 8 * 86400000);
  while (scheduled.getUTCDay() !== 1) scheduled.setUTCDate(scheduled.getUTCDate() + 1);
  scheduled.setUTCHours(14, 0, 0, 0);
  for (const path of ["/api/public/storefront/quote", "/api/storefront/quote"]) {
    const body = { items: [{ name: custom.productName, quantity: 1 }], customizations: [custom],
      fulfillment: { type: "pickup", scheduledAt: scheduled.toISOString(), recipient: { displayName: "Test Customer", email: "test@example.com", phone: "4165550123" } } };
    const headers = { "Content-Type": "application/json", ...(path === "/api/storefront/quote" ? { Cookie: "house_session=test" } : {}) };
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
    assert.equal(response.status, 200, await response.text());
    assert.equal(drafts.at(-1).line_items[0].modifiers.length, 2);
    body.customizations = [];
    const rejected = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
    assert.equal(rejected.status, 409);
    assert.equal((await rejected.json()).error.code, "BOX_SELECTION_REQUIRED");
  }
});
